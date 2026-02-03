/**
 * Collaboration API Routes
 * 
 * REST endpoints for collaboration features
 * Compatible with Phase 1, 2, 3
 */
use axum::{
    extract::{Extension, Path, Query, WebSocketUpgrade},
    http::StatusCode,
    response::{Json, Response},
    routing::get,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::services::collaboration::{SessionManager, CollaborationWebSocket};
use crate::security::{AuditLogger, AdvancedValidator};

#[derive(Debug, Serialize)]
pub struct SessionResponse {
    pub session: crate::services::collaboration::session::Session,
}

#[derive(Debug, Deserialize)]
pub struct CreateSessionRequest {
    pub name: String,
    pub owner_id: Uuid,
    pub project_path: String,
}

pub async fn create_session(
    Extension(session_manager): Extension<Arc<SessionManager>>,
    Json(request): Json<CreateSessionRequest>,
) -> Result<Json<SessionResponse>, StatusCode> {
    match session_manager.create_session(
        request.name,
        request.owner_id,
        request.project_path,
    ).await {
        Ok(session) => Ok(Json(SessionResponse { session })),
        Err(e) => {
            tracing::error!("Failed to create session: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn get_session(
    Extension(session_manager): Extension<Arc<SessionManager>>,
    Path(session_id): Path<Uuid>,
) -> Result<Json<SessionResponse>, StatusCode> {
    match session_manager.get_session(session_id).await {
        Some(session) => Ok(Json(SessionResponse { session })),
        None => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn join_session(
    Extension(session_manager): Extension<Arc<SessionManager>>,
    Path(session_id): Path<Uuid>,
    Json(request): Json<JoinSessionRequest>,
) -> Result<Json<ParticipantResponse>, StatusCode> {
    match session_manager.join_session(
        session_id,
        request.user_id,
        request.agent_id,
        request.role,
    ).await {
        Ok(participant) => Ok(Json(ParticipantResponse { participant })),
        Err(e) => {
            tracing::error!("Failed to join session: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct JoinSessionRequest {
    pub user_id: Option<Uuid>,
    pub agent_id: Option<Uuid>,
    pub role: crate::services::collaboration::session::ParticipantRole,
}

#[derive(Debug, Serialize)]
pub struct ParticipantResponse {
    pub participant: crate::services::collaboration::session::Participant,
}

#[derive(Debug, Deserialize)]
pub struct WebSocketQuery {
    participant_id: Option<Uuid>,
    user_id: Option<Uuid>,
    agent_id: Option<Uuid>,
}

pub async fn collaboration_websocket_handler(
    ws: WebSocketUpgrade,
    Path(session_id): Path<Uuid>,
    Query(query): Query<WebSocketQuery>,
    Extension(websocket_server): Extension<Arc<CollaborationWebSocket>>,
    Extension(session_manager): Extension<Arc<SessionManager>>,
) -> Response {
    // Generate participant_id if not provided
    let participant_id = query.participant_id.unwrap_or_else(Uuid::new_v4());

    ws.on_upgrade(move |socket| async move {
        // Verify session exists
        if session_manager.get_session(session_id).await.is_none() {
            tracing::error!("Session {} not found", session_id);
            return;
        }

        if let Err(e) = websocket_server.handle_connection(session_id, participant_id, socket).await {
            tracing::error!("WebSocket connection error: {}", e);
        }
    })
}

pub async fn get_session_by_token(
    Extension(session_manager): Extension<Arc<SessionManager>>,
    Path(token): Path<String>,
) -> Result<Json<SessionResponse>, StatusCode> {
    match session_manager.get_session_by_token(&token).await {
        Some(session) => Ok(Json(SessionResponse { session })),
        None => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn list_participants(
    Extension(session_manager): Extension<Arc<SessionManager>>,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ParticipantsResponse>, StatusCode> {
    let participants = session_manager.get_participants(session_id).await;
    Ok(Json(ParticipantsResponse { participants }))
}

#[derive(Debug, Serialize)]
pub struct ParticipantsResponse {
    pub participants: Vec<crate::services::collaboration::session::Participant>,
}
