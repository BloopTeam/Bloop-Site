/**
 * Conflict Resolver
 * 
 * Handles conflicts in simultaneous edits
 * Compatible with Phase 1, 2, 3 - uses existing codebase services
 */
use std::sync::Arc;
use uuid::Uuid;
use serde::{Serialize, Deserialize};

use crate::services::codebase::CodebaseIndexer;

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

pub struct ConflictResolver {
    codebase_indexer: Arc<CodebaseIndexer>,
}

impl ConflictResolver {
    pub fn new(codebase_indexer: Arc<CodebaseIndexer>) -> Arc<Self> {
        Arc::new(Self {
            codebase_indexer,
        })
    }

    pub async fn detect_conflict(
        &self,
        session_id: Uuid,
        file_path: &str,
        edit1: &str,
        edit2: &str,
    ) -> Option<Conflict> {
        // Simple conflict detection - would use OT/CRDT in production
        if edit1 != edit2 {
            Some(Conflict {
                id: Uuid::new_v4(),
                session_id,
                file_path: file_path.to_string(),
                conflict_type: ConflictType::SimultaneousEdit,
                conflict_data: serde_json::json!({
                    "edit1": edit1,
                    "edit2": edit2,
                }),
                detected_at: chrono::Utc::now(),
            })
        } else {
            None
        }
    }

    pub async fn resolve_conflict(
        &self,
        conflict: &Conflict,
        resolution_strategy: &str,
    ) -> anyhow::Result<String> {
        // Simple resolution - would use proper OT/CRDT in production
        match resolution_strategy {
            "last_write_wins" => {
                let edit2 = conflict.conflict_data["edit2"].as_str().unwrap_or("");
                Ok(edit2.to_string())
            }
            "first_write_wins" => {
                let edit1 = conflict.conflict_data["edit1"].as_str().unwrap_or("");
                Ok(edit1.to_string())
            }
            _ => {
                // Default: last write wins
                let edit2 = conflict.conflict_data["edit2"].as_str().unwrap_or("");
                Ok(edit2.to_string())
            }
        }
    }
}
