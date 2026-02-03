/**
 * Collaboration WebSocket Server
 * 
 * Real-time communication for collaboration sessions
 * Compatible with Phase 1, 2, 3 - follows openclaw_ws.rs pattern
 */
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use uuid::Uuid;
use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};

use super::session::{SessionManager, ParticipantRole};
use super::presence::PresenceTracker;
use super::conflict::ConflictResolver;
use crate::services::agent::AgentManager;
use crate::services::codebase::CodebaseIndexer;
use crate::security::AdvancedValidator;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum CollaborationMessage {
    #[serde(rename = "join")]
    Join {
        session_id: Uuid,
        user_id: Option<Uuid>,
        agent_id: Option<Uuid>,
        role: Option<String>,
    },
    #[serde(rename = "leave")]
    Leave {
        session_id: Uuid,
    },
    #[serde(rename = "edit")]
    Edit {
        session_id: Uuid,
        file_path: String,
        position: usize,
        length: usize,
        content: String,
        version: usize,
    },
    #[serde(rename = "cursor")]
    Cursor {
        session_id: Uuid,
        file_path: String,
        line: usize,
        column: usize,
    },
    #[serde(rename = "selection")]
    Selection {
        session_id: Uuid,
        file_path: String,
        start_line: usize,
        start_column: usize,
        end_line: usize,
        end_column: usize,
    },
    #[serde(rename = "presence")]
    Presence {
        session_id: Uuid,
        status: String,
        active_file: Option<String>,
    },
    #[serde(rename = "ping")]
    Ping,
    #[serde(rename = "pong")]
    Pong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollaborationResponse {
    pub success: bool,
    pub message_type: String,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

pub struct CollaborationWebSocket {
    connections: Arc<RwLock<HashMap<Uuid, HashMap<Uuid, broadcast::Sender<Message>>>>>, // session_id -> participant_id -> sender
    session_manager: Arc<SessionManager>,
    presence_tracker: Arc<PresenceTracker>,
    conflict_resolver: Arc<ConflictResolver>,
    agent_manager: Arc<AgentManager>,
    codebase_indexer: Arc<CodebaseIndexer>,
    validator: Arc<AdvancedValidator>,
}

impl CollaborationWebSocket {
    pub fn new(
        session_manager: Arc<SessionManager>,
        presence_tracker: Arc<PresenceTracker>,
        conflict_resolver: Arc<ConflictResolver>,
        agent_manager: Arc<AgentManager>,
        codebase_indexer: Arc<CodebaseIndexer>,
        validator: Arc<AdvancedValidator>,
    ) -> Arc<Self> {
        Arc::new(Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            session_manager,
            presence_tracker,
            conflict_resolver,
            agent_manager,
            codebase_indexer,
            validator,
        })
    }

    pub async fn handle_connection(
        &self,
        session_id: Uuid,
        participant_id: Uuid,
        socket: WebSocket,
    ) -> anyhow::Result<()> {
        let (mut sender, mut receiver) = socket.split();

        // Create broadcast channel for this participant
        let (tx, _rx) = broadcast::channel::<Message>(1000);
        {
            let mut connections = self.connections.write().await;
            connections
                .entry(session_id)
                .or_insert_with(HashMap::new)
                .insert(participant_id, tx.clone());
        }

        // Send welcome message
        let welcome = CollaborationResponse {
            success: true,
            message_type: "connected".to_string(),
            data: Some(serde_json::json!({
                "session_id": session_id,
                "participant_id": participant_id
            })),
            error: None,
        };
        if let Ok(msg) = serde_json::to_string(&welcome) {
            let _ = sender.send(Message::Text(msg)).await;
        }

        // Spawn task to handle incoming messages
        let session_manager = Arc::clone(&self.session_manager);
        let presence_tracker = Arc::clone(&self.presence_tracker);
        let conflict_resolver = Arc::clone(&self.conflict_resolver);
        let codebase_indexer = Arc::clone(&self.codebase_indexer);
        let validator = Arc::clone(&self.validator);
        let connections = Arc::clone(&self.connections);
        let ws_self = Arc::clone(self);

        tokio::spawn(async move {
            while let Some(msg) = receiver.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        // Validate message size (max 100KB)
                        if text.len() > 100 * 1024 {
                            tracing::warn!("Message too large: {} bytes", text.len());
                            continue;
                        }

                        // Validate and sanitize input
                        if let Err(e) = validator.validate_input(&text) {
                            tracing::warn!("Invalid message: {}", e);
                            continue;
                        }

                        // Handle message
                        if let Err(e) = ws_self.handle_message_internal(
                            session_id,
                            participant_id,
                            &text,
                        ).await {
                            tracing::error!("Error handling message: {}", e);
                        }
                    }
                    Ok(Message::Ping(_)) => {
                        // Respond to ping
                        if let Err(e) = sender.send(Message::Pong(vec![])).await {
                            tracing::error!("Failed to send pong: {}", e);
                            break;
                        }
                    }
                    Ok(Message::Close(_)) => {
                        break;
                    }
                    Err(e) => {
                        tracing::error!("WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }

            // Cleanup on disconnect
            let mut connections = connections.write().await;
            if let Some(session_connections) = connections.get_mut(&session_id) {
                session_connections.remove(&participant_id);
                if session_connections.is_empty() {
                    connections.remove(&session_id);
                }
            }
        });

        // Spawn task to send messages to client
        let mut rx = tx.subscribe();
        tokio::spawn(async move {
            while let Ok(msg) = rx.recv().await {
                if sender.send(msg).await.is_err() {
                    break;
                }
            }
        });

        Ok(())
    }

    async fn handle_message_internal(
        &self,
        session_id: Uuid,
        participant_id: Uuid,
        text: &str,
    ) -> anyhow::Result<()> {
        // Parse JSON message
        let message: CollaborationMessage = serde_json::from_str(text)
            .map_err(|e| anyhow::anyhow!("Failed to parse message: {}", e))?;

        match message {
            CollaborationMessage::Join { session_id: sid, user_id, agent_id, role } => {
                let role_enum = role.as_deref()
                    .and_then(|r| match r {
                        "owner" => Some(ParticipantRole::Owner),
                        "editor" => Some(ParticipantRole::Editor),
                        "viewer" => Some(ParticipantRole::Viewer),
                        "agent" => Some(ParticipantRole::Agent),
                        _ => None,
                    })
                    .unwrap_or(ParticipantRole::Viewer);

                self.session_manager.join_session(
                    sid,
                    user_id,
                    agent_id,
                    role_enum,
                ).await?;

                self.broadcast_to_session(sid, Message::Text(serde_json::to_string(&CollaborationResponse {
                    success: true,
                    message_type: "participant_joined".to_string(),
                    data: Some(serde_json::json!({
                        "participant_id": participant_id,
                        "user_id": user_id,
                        "agent_id": agent_id
                    })),
                    error: None,
                })?)).await?;
            }
            CollaborationMessage::Leave { session_id: sid } => {
                self.session_manager.leave_session(
                    sid,
                    None, // Will be determined from participant_id
                    None,
                ).await?;

                self.broadcast_to_session(sid, Message::Text(serde_json::to_string(&CollaborationResponse {
                    success: true,
                    message_type: "participant_left".to_string(),
                    data: Some(serde_json::json!({
                        "participant_id": participant_id
                    })),
                    error: None,
                })?)).await?;
            }
            CollaborationMessage::Edit { session_id: sid, file_path, position, length, content, version } => {
                // Validate file path
                if !self.validator.validate_file_path(&file_path) {
                    return Err(anyhow::anyhow!("Invalid file path"));
                }

                // Apply edit with conflict resolution
                // In production, would use Operational Transform here
                self.broadcast_edit(sid, participant_id, &file_path, position, length, &content, version).await?;
            }
            CollaborationMessage::Cursor { session_id: sid, file_path, line, column } => {
                // Update presence
                self.presence_tracker.update_presence(
                    sid,
                    None, // user_id
                    None, // agent_id
                    super::session::ParticipantStatus::Online,
                    Some(serde_json::json!({
                        "line": line,
                        "column": column
                    })),
                    Some(file_path.clone()),
                ).await;

                // Broadcast cursor position
                self.broadcast_to_session(sid, Message::Text(serde_json::to_string(&CollaborationResponse {
                    success: true,
                    message_type: "cursor_update".to_string(),
                    data: Some(serde_json::json!({
                        "participant_id": participant_id,
                        "file_path": file_path,
                        "line": line,
                        "column": column
                    })),
                    error: None,
                })?)).await?;
            }
            CollaborationMessage::Selection { session_id: sid, file_path, start_line, start_column, end_line, end_column } => {
                // Broadcast selection
                self.broadcast_to_session(sid, Message::Text(serde_json::to_string(&CollaborationResponse {
                    success: true,
                    message_type: "selection_update".to_string(),
                    data: Some(serde_json::json!({
                        "participant_id": participant_id,
                        "file_path": file_path,
                        "start_line": start_line,
                        "start_column": start_column,
                        "end_line": end_line,
                        "end_column": end_column
                    })),
                    error: None,
                })?)).await?;
            }
            CollaborationMessage::Presence { session_id: sid, status, active_file } => {
                let status_enum = match status.as_str() {
                    "away" => super::session::ParticipantStatus::Away,
                    "idle" => super::session::ParticipantStatus::Idle,
                    _ => super::session::ParticipantStatus::Online,
                };

                self.presence_tracker.update_presence(
                    sid,
                    None,
                    None,
                    status_enum,
                    None,
                    active_file,
                ).await;
            }
            CollaborationMessage::Ping => {
                // Respond with pong (handled in connection handler)
            }
            CollaborationMessage::Pong => {
                // Heartbeat received
            }
        }

        Ok(())
    }

    async fn broadcast_edit(
        &self,
        session_id: Uuid,
        participant_id: Uuid,
        file_path: &str,
        position: usize,
        length: usize,
        content: &str,
        version: usize,
    ) -> anyhow::Result<()> {
        // Broadcast edit to all participants except sender
        let response = CollaborationResponse {
            success: true,
            message_type: "edit".to_string(),
            data: Some(serde_json::json!({
                "participant_id": participant_id,
                "file_path": file_path,
                "position": position,
                "length": length,
                "content": content,
                "version": version
            })),
            error: None,
        };

        self.broadcast_to_session_except(session_id, participant_id, Message::Text(serde_json::to_string(&response)?)).await?;
        Ok(())
    }

    pub async fn broadcast_to_session(
        &self,
        session_id: Uuid,
        message: Message,
    ) -> anyhow::Result<()> {
        let connections = self.connections.read().await;
        if let Some(session_connections) = connections.get(&session_id) {
            for tx in session_connections.values() {
                let _ = tx.send(message.clone());
            }
        }
        Ok(())
    }

    async fn broadcast_to_session_except(
        &self,
        session_id: Uuid,
        exclude_participant_id: Uuid,
        message: Message,
    ) -> anyhow::Result<()> {
        let connections = self.connections.read().await;
        if let Some(session_connections) = connections.get(&session_id) {
            for (participant_id, tx) in session_connections.iter() {
                if *participant_id != exclude_participant_id {
                    let _ = tx.send(message.clone());
                }
            }
        }
        Ok(())
    }

    pub async fn is_connected(&self, session_id: Uuid) -> bool {
        let connections = self.connections.read().await;
        connections.contains_key(&session_id) && !connections.get(&session_id).map(|m| m.is_empty()).unwrap_or(true)
    }

    pub async fn get_connected_participants(&self, session_id: Uuid) -> Vec<Uuid> {
        let connections = self.connections.read().await;
        connections.get(&session_id)
            .map(|m| m.keys().cloned().collect())
            .unwrap_or_default()
    }
}
