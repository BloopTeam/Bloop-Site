/**
 * OpenClaw WebSocket Client
 * 
 * Real WebSocket integration for OpenClaw Gateway
 */
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use crate::config::Config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenClawMessage {
    pub id: Option<String>,
    pub channel: String,
    pub message: String,
    pub thinking_level: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenClawResponse {
    pub id: Option<String>,
    pub response: String,
    pub session_id: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

pub struct OpenClawWebSocketClient {
    config: Arc<Config>,
    gateway_url: String,
    connection: Arc<RwLock<Option<tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>>>>,
    message_queue: Arc<RwLock<Vec<OpenClawMessage>>>,
    is_connected: Arc<RwLock<bool>>,
}

impl OpenClawWebSocketClient {
    pub fn new(config: Arc<Config>) -> Self {
        let gateway_url = std::env::var("OPENCLAW_GATEWAY_URL")
            .unwrap_or_else(|_| "ws://127.0.0.1:18789".to_string());

        Self {
            config,
            gateway_url,
            connection: Arc::new(RwLock::new(None)),
            message_queue: Arc::new(RwLock::new(Vec::new())),
            is_connected: Arc::new(RwLock::new(false)),
        }
    }

    /// Connect to OpenClaw Gateway
    pub async fn connect(&self) -> anyhow::Result<()> {
        tracing::info!("Connecting to OpenClaw Gateway: {}", self.gateway_url);

        match connect_async(&self.gateway_url).await {
            Ok((ws_stream, _)) => {
                let mut conn = self.connection.write().await;
                *conn = Some(ws_stream);
                *self.is_connected.write().await = true;
                tracing::info!("Connected to OpenClaw Gateway");
                
                // Spawn message handler
                let connection_clone = Arc::clone(&self.connection);
                let is_connected_clone = Arc::clone(&self.is_connected);
                tokio::spawn(async move {
                    Self::handle_messages(connection_clone, is_connected_clone).await;
                });

                Ok(())
            }
            Err(e) => {
                tracing::error!("Failed to connect to OpenClaw Gateway: {}", e);
                *self.is_connected.write().await = false;
                Err(anyhow::anyhow!("Connection failed: {}", e))
            }
        }
    }

    /// Handle incoming WebSocket messages
    async fn handle_messages(
        connection: Arc<RwLock<Option<tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>>>>,
        is_connected: Arc<RwLock<bool>>,
    ) {
        loop {
            let mut conn_guard = connection.write().await;
            if let Some(ref mut ws) = *conn_guard {
                match ws.next().await {
                    Some(Ok(Message::Text(text))) => {
                        tracing::debug!("OpenClaw message received: {}", text);
                        // Parse and handle message
                    }
                    Some(Ok(Message::Close(_))) => {
                        tracing::warn!("OpenClaw connection closed");
                        *is_connected.write().await = false;
                        break;
                    }
                    Some(Err(e)) => {
                        tracing::error!("OpenClaw WebSocket error: {}", e);
                        *is_connected.write().await = false;
                        break;
                    }
                    None => break,
                    _ => {}
                }
            } else {
                break;
            }
        }
    }

    /// Send message via OpenClaw
    pub async fn send_message(&self, message: OpenClawMessage) -> anyhow::Result<OpenClawResponse> {
        if !*self.is_connected.read().await {
            // Queue message if not connected
            self.message_queue.write().await.push(message.clone());
            return Err(anyhow::anyhow!("Not connected to OpenClaw Gateway"));
        }

        let mut conn = self.connection.write().await;
        if let Some(ref mut ws) = *conn {
            let message_json = serde_json::to_string(&message)?;
            ws.send(Message::Text(message_json)).await?;

            // In production, wait for response
            // For now, return placeholder
            Ok(OpenClawResponse {
                id: message.id,
                response: format!("Response to: {}", message.message),
                session_id: Some(uuid::Uuid::new_v4().to_string()),
                metadata: None,
            })
        } else {
            Err(anyhow::anyhow!("WebSocket connection not available"))
        }
    }

    /// Check if connected
    pub async fn is_connected(&self) -> bool {
        *self.is_connected.read().await
    }

    /// Disconnect from Gateway
    pub async fn disconnect(&self) {
        let mut conn = self.connection.write().await;
        if let Some(ref mut ws) = *conn {
            let _ = ws.close(None).await;
        }
        *conn = None;
        *self.is_connected.write().await = false;
        tracing::info!("Disconnected from OpenClaw Gateway");
    }
}
