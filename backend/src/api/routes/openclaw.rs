/**
 * OpenClaw API route handlers
 * Provides API endpoints for OpenClaw Gateway integration
 */
use axum::{
    extract::{Extension, Path, Query},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use crate::config::Config;

// Types for OpenClaw integration

#[derive(Debug, Serialize)]
pub struct OpenClawStatus {
    pub enabled: bool,
    pub connected: bool,
    pub gateway_url: String,
    pub sessions: u32,
    pub skills: u32,
    pub uptime: u64,
}

#[derive(Debug, Serialize)]
pub struct OpenClawSession {
    pub id: String,
    pub channel: String,
    pub status: String,
    pub model: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct OpenClawSkill {
    pub name: String,
    pub description: String,
    pub skill_type: String,
    pub enabled: bool,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub message: String,
    pub thinking_level: Option<String>,
    pub model: Option<String>,
    pub session_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: String,
    pub model: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteSkillRequest {
    pub params: Option<serde_json::Value>,
    pub context: Option<CodeContext>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CodeContext {
    pub file_path: Option<String>,
    pub code: Option<String>,
    pub language: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SkillResult {
    pub success: bool,
    pub output: Option<String>,
    pub error: Option<String>,
    pub duration: Option<u64>,
}

/// Get OpenClaw Gateway status
pub async fn get_status(
    Extension(config): Extension<Config>,
) -> Result<Json<OpenClawStatus>, StatusCode> {
    // Check if OpenClaw is configured
    let gateway_url = std::env::var("OPENCLAW_GATEWAY_URL")
        .unwrap_or_else(|_| "ws://127.0.0.1:18789".to_string());
    
    let enabled = std::env::var("OPENCLAW_ENABLED")
        .map(|v| v == "true")
        .unwrap_or(false);

    // In a real implementation, we would connect to the Gateway
    // For now, return configured status
    Ok(Json(OpenClawStatus {
        enabled,
        connected: false, // Would check actual connection
        gateway_url,
        sessions: 0,
        skills: get_bloop_skills().len() as u32,
        uptime: 0,
    }))
}

/// List OpenClaw sessions
pub async fn list_sessions(
    Extension(_config): Extension<Config>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // In production, this would query the Gateway
    Ok(Json(serde_json::json!({
        "sessions": [],
        "total": 0
    })))
}

/// Get session history
pub async fn get_session_history(
    Extension(_config): Extension<Config>,
    Path(session_id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(serde_json::json!({
        "session_id": session_id,
        "messages": [],
        "total": 0
    })))
}

/// Send message to OpenClaw agent
pub async fn send_message(
    Extension(_config): Extension<Config>,
    Json(request): Json<SendMessageRequest>,
) -> Result<Json<MessageResponse>, StatusCode> {
    use chrono::Utc;
    use uuid::Uuid;

    // In production, this would send to the Gateway
    // For now, return a mock response
    Ok(Json(MessageResponse {
        id: Uuid::new_v4().to_string(),
        role: "assistant".to_string(),
        content: format!(
            "OpenClaw integration is configured. Message received: {}",
            request.message
        ),
        timestamp: Utc::now().to_rfc3339(),
        model: request.model,
    }))
}

/// List available skills
pub async fn list_skills(
    Extension(_config): Extension<Config>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let skills = get_bloop_skills();
    
    Ok(Json(serde_json::json!({
        "skills": skills,
        "total": skills.len()
    })))
}

/// Execute a skill
pub async fn execute_skill(
    Extension(_config): Extension<Config>,
    Path(skill_name): Path<String>,
    Json(request): Json<ExecuteSkillRequest>,
) -> Result<Json<SkillResult>, StatusCode> {
    // Find the skill
    let skills = get_bloop_skills();
    let skill = skills.iter().find(|s| s.name == skill_name);

    match skill {
        Some(s) => {
            // In production, execute the skill via Gateway
            // For now, return mock result
            Ok(Json(SkillResult {
                success: true,
                output: Some(format!(
                    "Executed skill '{}' with context: {:?}",
                    s.name,
                    request.context
                )),
                error: None,
                duration: Some(100),
            }))
        }
        None => {
            Ok(Json(SkillResult {
                success: false,
                output: None,
                error: Some(format!("Skill '{}' not found", skill_name)),
                duration: None,
            }))
        }
    }
}

// Get Bloop-specific skills
fn get_bloop_skills() -> Vec<OpenClawSkill> {
    vec![
        OpenClawSkill {
            name: "bloop-code-review".to_string(),
            description: "AI-powered code review with security and quality analysis".to_string(),
            skill_type: "workspace".to_string(),
            enabled: true,
            capabilities: vec![
                "syntax-analysis".to_string(),
                "security-scanning".to_string(),
                "performance-hints".to_string(),
                "best-practices".to_string(),
            ],
        },
        OpenClawSkill {
            name: "bloop-test-gen".to_string(),
            description: "Generate comprehensive test suites for code".to_string(),
            skill_type: "workspace".to_string(),
            enabled: true,
            capabilities: vec![
                "unit-tests".to_string(),
                "integration-tests".to_string(),
                "edge-cases".to_string(),
                "coverage-optimization".to_string(),
            ],
        },
        OpenClawSkill {
            name: "bloop-docs".to_string(),
            description: "Auto-generate documentation from code".to_string(),
            skill_type: "workspace".to_string(),
            enabled: true,
            capabilities: vec![
                "api-reference".to_string(),
                "usage-examples".to_string(),
                "type-documentation".to_string(),
            ],
        },
        OpenClawSkill {
            name: "bloop-refactor".to_string(),
            description: "Intelligent code refactoring suggestions".to_string(),
            skill_type: "workspace".to_string(),
            enabled: true,
            capabilities: vec![
                "extract-function".to_string(),
                "rename-symbol".to_string(),
                "simplify-logic".to_string(),
                "remove-duplication".to_string(),
            ],
        },
        OpenClawSkill {
            name: "bloop-debug".to_string(),
            description: "AI-assisted debugging and error analysis".to_string(),
            skill_type: "workspace".to_string(),
            enabled: true,
            capabilities: vec![
                "error-analysis".to_string(),
                "stack-trace-parsing".to_string(),
                "fix-suggestions".to_string(),
            ],
        },
        OpenClawSkill {
            name: "bloop-optimize".to_string(),
            description: "Performance optimization suggestions".to_string(),
            skill_type: "workspace".to_string(),
            enabled: true,
            capabilities: vec![
                "complexity-analysis".to_string(),
                "memory-optimization".to_string(),
                "algorithm-suggestions".to_string(),
            ],
        },
        OpenClawSkill {
            name: "bloop-security".to_string(),
            description: "Security vulnerability scanning".to_string(),
            skill_type: "workspace".to_string(),
            enabled: true,
            capabilities: vec![
                "vulnerability-detection".to_string(),
                "dependency-audit".to_string(),
                "secure-coding-tips".to_string(),
            ],
        },
    ]
}
