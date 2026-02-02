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

use super::session::SessionManager;
use crate::services::agent::AgentManager;
use crate::services::codebase::CodebaseIndexer;

pub struct CollaborationWebSocket {
    connections: Arc<RwLock<HashMap<Uuid, broadcast::Sender<Message>>>>,
    session_manager: Arc<SessionManager>,
    agent_manager: Arc<AgentManager>,
    codebase_indexer: Arc<CodebaseIndexer>,
}

impl CollaborationWebSocket {
    pub fn new(
        session_manager: Arc<SessionManager>,
        agent_manager: Arc<AgentManager>,
        codebase_indexer: Arc<CodebaseIndexer>,
    ) -> Arc<Self> {
        Arc::new(Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            session_manager,
            agent_manager,
            codebase_indexer,
        })
    }

    pub async fn handle_connection(
        &self,
        session_id: Uuid,
        socket: WebSocket,
    ) -> anyhow::Result<()> {
        let (mut sender, mut receiver) = socket.split();

        // Create broadcast channel for this session
        let (tx, _rx) = broadcast::channel::<Message>(100);
        {
            let mut connections = self.connections.write().await;
            connections.insert(session_id, tx.clone());
        }

        // Spawn task to handle incoming messages
        let session_manager = Arc::clone(&self.session_manager);
        let agent_manager = Arc::clone(&self.agent_manager);
        let codebase_indexer = Arc::clone(&self.codebase_indexer);
        let connections = Arc::clone(&self.connections);

        tokio::spawn(async move {
            while let Some(msg) = receiver.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        // Handle text message
                        if let Err(e) = Self::handle_message(
                            &session_manager,
                            &agent_manager,
                            &codebase_indexer,
                            &connections,
                            session_id,
                            &text,
                        ).await {
                            tracing::error!("Error handling message: {}", e);
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

            // Cleanup
            let mut connections = connections.write().await;
            connections.remove(&session_id);
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

    async fn handle_message(
        session_manager: &SessionManager,
        _agent_manager: &AgentManager,
        _codebase_indexer: &CodebaseIndexer,
        connections: &Arc<RwLock<HashMap<Uuid, broadcast::Sender<Message>>>>,
        session_id: Uuid,
        text: &str,
    ) -> anyhow::Result<()> {
        // Parse message (simplified - would use serde_json in production)
        // Broadcast to all connections in session
        if let Some(tx) = connections.read().await.get(&session_id) {
            let _ = tx.send(Message::Text(text.to_string()));
        }
        Ok(())
    }

    pub async fn broadcast_to_session(
        &self,
        session_id: Uuid,
        message: Message,
    ) -> anyhow::Result<()> {
        if let Some(tx) = self.connections.read().await.get(&session_id) {
            let _ = tx.send(message);
        }
        Ok(())
    }

    pub async fn is_connected(&self, session_id: Uuid) -> bool {
        self.connections.read().await.contains_key(&session_id)
    }
}
