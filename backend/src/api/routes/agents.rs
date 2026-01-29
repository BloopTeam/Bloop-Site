/**
 * Agent API route handlers
 */
use axum::{
    extract::{Extension, Path, Query},
    http::StatusCode,
    response::Json,
};
use serde::Deserialize;
use crate::types::{AgentTask, TaskType, Priority};
use crate::config::Config;
use crate::services::agent::AgentManager;
use crate::services::agent::types::AgentType;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct CreateAgentRequest {
    pub agent_type: Option<String>,
    pub name: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateTaskRequest {
    pub task_type: TaskType,
    pub description: String,
    pub priority: Option<Priority>,
    pub context: Option<crate::types::CodebaseContext>,
}

/// Create a new agent
pub async fn create_agent(
    Extension(_config): Extension<Config>,
    Extension(manager): Extension<Arc<AgentManager>>,
    Query(params): Query<CreateAgentRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let agent_type = match params.agent_type.as_deref() {
        Some("code_generator") => AgentType::CodeGenerator,
        Some("code_analyzer") => AgentType::CodeAnalyzer,
        Some("refactorer") => AgentType::Refactorer,
        Some("debugger") => AgentType::Debugger,
        Some("documenter") => AgentType::Documenter,
        Some("tester") => AgentType::Tester,
        Some("reviewer") => AgentType::Reviewer,
        Some("optimizer") => AgentType::Optimizer,
        Some("security") => AgentType::Security,
        Some("migrator") => AgentType::Migrator,
        _ => AgentType::CodeGenerator, // Default
    };

    match manager.create_agent(agent_type, params.name).await {
        Ok(agent) => Ok(Json(serde_json::json!({
            "id": agent.id,
            "name": agent.name,
            "agent_type": agent.agent_type,
            "status": agent.status,
            "capabilities": agent.capabilities,
        }))),
        Err(e) => {
            tracing::error!("Failed to create agent: {}", e);
            Err(StatusCode::BAD_REQUEST)
        }
    }
}

/// Create a new task (will be decomposed and assigned to agents)
pub async fn create_task(
    Extension(_config): Extension<Config>,
    Extension(manager): Extension<Arc<AgentManager>>,
    Json(request): Json<CreateTaskRequest>,
) -> Result<Json<AgentTask>, StatusCode> {
    use uuid::Uuid;
    use chrono::Utc;

    let task = AgentTask {
        id: Uuid::new_v4().to_string(),
        r#type: request.task_type,
        description: request.description,
        context: request.context.unwrap_or_default(),
        priority: request.priority.unwrap_or(Priority::Medium),
        status: crate::types::TaskStatus::Pending,
        result: None,
        error: None,
        created_at: Utc::now(),
        completed_at: None,
    };

    match manager.create_task(task).await {
        Ok(task) => Ok(Json(task)),
        Err(e) => {
            tracing::error!("Failed to create task: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Get agent status by ID
pub async fn get_agent_status(
    Extension(_config): Extension<Config>,
    Extension(manager): Extension<Arc<AgentManager>>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    match manager.get_agent(&id).await {
        Some(agent) => Ok(Json(serde_json::json!({
            "id": agent.id,
            "name": agent.name,
            "agent_type": agent.agent_type,
            "status": agent.status,
            "current_task": agent.current_task,
            "capabilities": agent.capabilities,
        }))),
        None => Err(StatusCode::NOT_FOUND),
    }
}

/// Get task status by ID
pub async fn get_task_status(
    Extension(_config): Extension<Config>,
    Extension(manager): Extension<Arc<AgentManager>>,
    Path(id): Path<String>,
) -> Result<Json<AgentTask>, StatusCode> {
    match manager.get_task_status(&id).await {
        Some(task) => Ok(Json(task)),
        None => Err(StatusCode::NOT_FOUND),
    }
}

/// List all agents
pub async fn list_agents(
    Extension(_config): Extension<Config>,
    Extension(manager): Extension<Arc<AgentManager>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let agents = manager.list_agents().await;
    Ok(Json(serde_json::json!({
        "agents": agents,
        "total": agents.len(),
    })))
}

/// List all tasks
pub async fn list_tasks(
    Extension(_config): Extension<Config>,
    Extension(manager): Extension<Arc<AgentManager>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tasks = manager.list_tasks().await;
    Ok(Json(serde_json::json!({
        "tasks": tasks,
        "total": tasks.len(),
    })))
}

/// Get agent system metrics
pub async fn get_metrics(
    Extension(_config): Extension<Config>,
    Extension(manager): Extension<Arc<AgentManager>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let metrics = manager.metrics().get_metrics().await;
    let avg_execution_time = manager.metrics().get_average_execution_time().await;
    let success_rate = manager.metrics().get_success_rate().await;
    let queue_status = manager.get_queue_status().await;
    let health_status = manager.get_health_status().await;
    
    Ok(Json(serde_json::json!({
        "total_agents_created": metrics.total_agents_created,
        "total_tasks_executed": metrics.total_tasks_executed,
        "successful_tasks": metrics.successful_tasks,
        "failed_tasks": metrics.failed_tasks,
        "success_rate": success_rate,
        "total_execution_time_ms": metrics.total_execution_time_ms,
        "average_execution_time_ms": avg_execution_time,
        "total_tokens_used": metrics.total_tokens_used,
        "active_agents": metrics.active_agents,
        "active_tasks": metrics.active_tasks,
        "queue_status": queue_status,
        "health_status": health_status,
    })))
}

/// Get queue status
pub async fn get_queue_status(
    Extension(_config): Extension<Config>,
    Extension(manager): Extension<Arc<AgentManager>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(manager.get_queue_status().await))
}

/// Get health status
pub async fn get_health_status(
    Extension(_config): Extension<Config>,
    Extension(manager): Extension<Arc<AgentManager>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(manager.get_health_status().await))
}
