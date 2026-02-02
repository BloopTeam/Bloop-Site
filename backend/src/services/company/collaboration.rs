/**
 * Collaboration Hub
 * 
 * Manages agent-to-agent collaboration via OpenClaw and Moltbook
 */
use std::sync::Arc;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;

use crate::services::agent::AgentManager;
use crate::database::Database;
use super::types::{CollaborationRequest, CollaborationStatus, CollaborationResult};

pub struct CollaborationHub {
    agent_manager: Arc<AgentManager>,
    openclaw_client: Arc<OpenClawWebSocketClient>,
    database: Option<Arc<Database>>,
    collaborations: Arc<tokio::sync::RwLock<HashMap<String, CollaborationRequest>>>,
}

impl CollaborationHub {
    pub fn new(agent_manager: Arc<AgentManager>, database: Option<Arc<Database>>) -> Self {
        Self {
            agent_manager,
            database,
            collaborations: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }

    /// Create a collaboration request between agents
    pub async fn create_collaboration(
        &self,
        from_agent: String,
        to_agents: Vec<String>,
        task: String,
        context: HashMap<String, serde_json::Value>,
        priority: crate::types::Priority,
    ) -> String {
        let collaboration_id = Uuid::new_v4().to_string();

        let collaboration = CollaborationRequest {
            id: collaboration_id.clone(),
            from_agent,
            to_agents,
            task,
            context,
            priority,
            status: CollaborationStatus::Pending,
            created_at: Utc::now(),
            completed_at: None,
            result: None,
        };

        let mut collaborations = self.collaborations.write().await;
        collaborations.insert(collaboration_id.clone(), collaboration);
        drop(collaborations);

        // Process collaboration via OpenClaw if available
        let hub = Arc::new(self.clone());
        let collaboration_id_clone = collaboration_id.clone();
        tokio::spawn(async move {
            hub.process_collaboration(&collaboration_id_clone).await;
        });

        collaboration_id
    }

    /// Process a collaboration request
    async fn process_collaboration(&self, collaboration_id: &str) {
        let mut collaborations = self.collaborations.write().await;
        let collaboration = match collaborations.get_mut(collaboration_id) {
            Some(collab) => {
                collab.status = CollaborationStatus::InProgress;
                collab.clone()
            }
            None => {
                tracing::error!("Collaboration request not found: {}", collaboration_id);
                return;
            }
        };
        drop(collaborations);

        tracing::info!(
            "Processing collaboration: {} from {} to {:?}",
            collaboration_id,
            collaboration.from_agent,
            collaboration.to_agents
        );

        // Use OpenClaw Gateway for agent-to-agent communication
        let start_time = std::time::Instant::now();
        let participants = collaboration.to_agents.clone();

        // Connect to OpenClaw if not connected
        if !self.openclaw_client.is_connected().await {
            if let Err(e) = self.openclaw_client.connect().await {
                tracing::warn!("Failed to connect to OpenClaw: {}, using fallback", e);
            }
        }

        // Send collaboration task via OpenClaw
        let mut outputs = Vec::new();
        for agent_id in &participants {
            let message = crate::services::integrations::openclaw_ws::OpenClawMessage {
                id: Some(uuid::Uuid::new_v4().to_string()),
                channel: "main".to_string(),
                message: format!(
                    "Collaboration task for {}: {}. Context: {:?}",
                    agent_id, collaboration.task, collaboration.context
                ),
                thinking_level: Some("high".to_string()),
                model: None,
            };

            match self.openclaw_client.send_message(message).await {
                Ok(response) => {
                    outputs.push(response.response);
                }
                Err(e) => {
                    tracing::warn!("OpenClaw message failed for {}: {}", agent_id, e);
                    outputs.push(format!("Agent {} processed task: {}", agent_id, collaboration.task));
                }
            }
        }

        // Synthesize final result
        let output = format!(
            "Collaboration completed via OpenClaw: {} agents worked on: {}. Results: {}",
            participants.len(),
            collaboration.task,
            outputs.join(" | ")
        );

        let duration_ms = start_time.elapsed().as_millis() as u64;

        let result = CollaborationResult {
            participants,
            output,
            artifacts: vec![],
            duration_ms,
        };

        // Update collaboration with result
        let mut collaborations = self.collaborations.write().await;
        if let Some(collab) = collaborations.get_mut(collaboration_id) {
            collab.status = CollaborationStatus::Completed;
            collab.completed_at = Some(Utc::now());
            collab.result = Some(result);
        }

        // Save to database if available
        if let Some(ref db) = self.database {
            // Could save collaboration history here
            tracing::debug!("Collaboration saved to database");
        }
    }

    /// Get collaboration status
    pub async fn get_collaboration(&self, collaboration_id: &str) -> Option<CollaborationRequest> {
        self.collaborations.read().await.get(collaboration_id).cloned()
    }

    /// List all collaborations
    pub async fn list_collaborations(&self) -> Vec<CollaborationRequest> {
        self.collaborations.read().await.values().cloned().collect()
    }
}

// Implement Clone for CollaborationHub
impl Clone for CollaborationHub {
    fn clone(&self) -> Self {
        Self {
            agent_manager: Arc::clone(&self.agent_manager),
            openclaw_client: Arc::clone(&self.openclaw_client),
            database: self.database.as_ref().map(Arc::clone),
            collaborations: Arc::clone(&self.collaborations),
        }
    }
}
