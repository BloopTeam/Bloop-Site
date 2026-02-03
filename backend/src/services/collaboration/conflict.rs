/**
 * Conflict Resolver with Operational Transform
 * 
 * Handles conflicts in simultaneous edits using Operational Transform (OT)
 * Compatible with Phase 1, 2, 3 - uses existing codebase services
 */
use std::sync::Arc;
use uuid::Uuid;
use serde::{Serialize, Deserialize};

use crate::services::codebase::CodebaseIndexer;
use crate::database::Database;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conflict {
    pub id: Uuid,
    pub session_id: Uuid,
    pub file_path: String,
    pub conflict_type: ConflictType,
    pub conflict_data: serde_json::Value,
    pub detected_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConflictType {
    SimultaneousEdit,
    ConcurrentModification,
    DependencyConflict,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditOperation {
    pub id: Uuid,
    pub session_id: Uuid,
    pub participant_id: Uuid,
    pub file_path: String,
    pub operation_type: OperationType,
    pub position: usize,
    pub length: usize,
    pub content: String,
    pub version: usize,
    pub parent_version: Option<usize>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationType {
    Insert,
    Delete,
    Retain,
}

pub struct ConflictResolver {
    codebase_indexer: Arc<CodebaseIndexer>,
    database: Option<Arc<Database>>,
}

impl ConflictResolver {
    pub fn new(
        codebase_indexer: Arc<CodebaseIndexer>,
        database: Option<Arc<Database>>,
    ) -> Arc<Self> {
        Arc::new(Self {
            codebase_indexer,
            database,
        })
    }

    /// Transform an operation against another operation (OT algorithm)
    pub fn transform_operation(
        &self,
        op1: &EditOperation,
        op2: &EditOperation,
    ) -> EditOperation {
        // Operational Transform: transform op1 against op2
        match (&op1.operation_type, &op2.operation_type) {
            (OperationType::Insert, OperationType::Insert) => {
                // Both inserts: if op2 is before op1, shift op1
                if op2.position < op1.position {
                    EditOperation {
                        position: op1.position + op2.content.len(),
                        ..op1.clone()
                    }
                } else {
                    op1.clone()
                }
            }
            (OperationType::Insert, OperationType::Delete) => {
                // Insert vs Delete: if delete is before insert, shift insert
                if op2.position < op1.position {
                    EditOperation {
                        position: op1.position.saturating_sub(op2.length.min(op1.position)),
                        ..op1.clone()
                    }
                } else if op2.position <= op1.position + op1.content.len() {
                    // Delete overlaps with insert
                    EditOperation {
                        position: op2.position,
                        ..op1.clone()
                    }
                } else {
                    op1.clone()
                }
            }
            (OperationType::Delete, OperationType::Insert) => {
                // Delete vs Insert: if insert is before delete, shift delete
                if op2.position <= op1.position {
                    EditOperation {
                        position: op1.position + op2.content.len(),
                        ..op1.clone()
                    }
                } else if op2.position < op1.position + op1.length {
                    // Insert is within delete range
                    EditOperation {
                        length: op1.length + op2.content.len(),
                        ..op1.clone()
                    }
                } else {
                    op1.clone()
                }
            }
            (OperationType::Delete, OperationType::Delete) => {
                // Both deletes: transform positions
                if op2.position < op1.position {
                    EditOperation {
                        position: op1.position.saturating_sub(op2.length),
                        length: op1.length,
                        ..op1.clone()
                    }
                } else if op2.position < op1.position + op1.length {
                    // Overlapping deletes
                    EditOperation {
                        length: op1.length.saturating_sub(op2.length),
                        ..op1.clone()
                    }
                } else {
                    op1.clone()
                }
            }
            _ => op1.clone(),
        }
    }

    /// Apply an operation to text content
    pub fn apply_operation(&self, text: &str, operation: &EditOperation) -> String {
        match operation.operation_type {
            OperationType::Insert => {
                let mut result = text.to_string();
                let pos = operation.position.min(result.len());
                result.insert_str(pos, &operation.content);
                result
            }
            OperationType::Delete => {
                let mut result = text.to_string();
                let start = operation.position.min(result.len());
                let end = (operation.position + operation.length).min(result.len());
                result.replace_range(start..end, "");
                result
            }
            OperationType::Retain => text.to_string(),
        }
    }

    /// Detect conflicts between operations
    pub async fn detect_conflict(
        &self,
        session_id: Uuid,
        file_path: &str,
        op1: &EditOperation,
        op2: &EditOperation,
    ) -> Option<Conflict> {
        // Check if operations conflict (overlap or interfere)
        let op1_end = op1.position + match op1.operation_type {
            OperationType::Insert => op1.content.len(),
            OperationType::Delete => op1.length,
            OperationType::Retain => 0,
        };
        let op2_end = op2.position + match op2.operation_type {
            OperationType::Insert => op2.content.len(),
            OperationType::Delete => op2.length,
            OperationType::Retain => 0,
        };

        // Check for overlap
        let overlaps = !(op1_end <= op2.position || op2_end <= op1.position);

        if overlaps && op1.file_path == op2.file_path {
            Some(Conflict {
                id: Uuid::new_v4(),
                session_id,
                file_path: file_path.to_string(),
                conflict_type: ConflictType::SimultaneousEdit,
                conflict_data: serde_json::json!({
                    "op1": serde_json::to_value(op1).unwrap_or_default(),
                    "op2": serde_json::to_value(op2).unwrap_or_default(),
                }),
                detected_at: chrono::Utc::now(),
            })
        } else {
            None
        }
    }

    /// Resolve conflict using Operational Transform
    pub async fn resolve_conflict_with_ot(
        &self,
        base_text: &str,
        operations: Vec<EditOperation>,
    ) -> anyhow::Result<String> {
        // Apply operations in order, transforming each against previous ones
        let mut text = base_text.to_string();
        let mut transformed_ops = Vec::new();

        for op in operations {
            // Transform against all previous operations
            let mut transformed = op.clone();
            for prev_op in &transformed_ops {
                transformed = self.transform_operation(&transformed, prev_op);
            }
            transformed_ops.push(transformed.clone());
            text = self.apply_operation(&text, &transformed);
        }

        Ok(text)
    }

    /// Resolve conflict using simple strategies (fallback)
    pub async fn resolve_conflict(
        &self,
        conflict: &Conflict,
        resolution_strategy: &str,
    ) -> anyhow::Result<String> {
        match resolution_strategy {
            "last_write_wins" => {
                let op2: EditOperation = serde_json::from_value(
                    conflict.conflict_data["op2"].clone()
                ).map_err(|e| anyhow::anyhow!("Failed to parse op2: {}", e))?;
                Ok(op2.content)
            }
            "first_write_wins" => {
                let op1: EditOperation = serde_json::from_value(
                    conflict.conflict_data["op1"].clone()
                ).map_err(|e| anyhow::anyhow!("Failed to parse op1: {}", e))?;
                Ok(op1.content)
            }
            "merge" => {
                // Merge both operations
                let op1: EditOperation = serde_json::from_value(
                    conflict.conflict_data["op1"].clone()
                ).map_err(|e| anyhow::anyhow!("Failed to parse op1: {}", e))?;
                let op2: EditOperation = serde_json::from_value(
                    conflict.conflict_data["op2"].clone()
                ).map_err(|e| anyhow::anyhow!("Failed to parse op2: {}", e))?;
                
                let transformed_op2 = self.transform_operation(&op2, &op1);
                Ok(format!("{}{}", op1.content, transformed_op2.content))
            }
            _ => {
                // Default: last write wins
                let op2: EditOperation = serde_json::from_value(
                    conflict.conflict_data["op2"].clone()
                ).map_err(|e| anyhow::anyhow!("Failed to parse op2: {}", e))?;
                Ok(op2.content)
            }
        }
    }
}
