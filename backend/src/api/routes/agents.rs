/**
 * Agent API route handlers
 */
use axum::{
    extract::{Extension, Path},
    http::StatusCode,
    response::Json,
};
use crate::types::AgentTask;
use crate::config::Config;

pub async fn create_agent(
    Extension(_config): Extension<Config>,
    Json(_task): Json<AgentTask>,
) -> Result<Json<AgentTask>, StatusCode> {
    // TODO: Implement agent creation
    Err(StatusCode::NOT_IMPLEMENTED)
}

pub async fn get_agent_status(
    Extension(_config): Extension<Config>,
    Path(id): Path<String>,
) -> Result<Json<AgentTask>, StatusCode> {
    // TODO: Implement agent status retrieval
    Err(StatusCode::NOT_IMPLEMENTED)
}
