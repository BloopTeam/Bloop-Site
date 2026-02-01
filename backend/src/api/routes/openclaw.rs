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
use validator::Validate;
use std::sync::Arc;
use crate::config::Config;
use crate::database::Database;
use crate::middleware::security::{sanitize_string, validate_skill_name, MAX_STRING_LENGTH};

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

#[derive(Debug, Deserialize, Validate)]
pub struct SendMessageRequest {
    #[validate(length(max = "MAX_STRING_LENGTH"))]
    pub message: String,
    
    #[validate(length(max = "50"))]
    pub thinking_level: Option<String>,
    
    #[validate(length(max = "100"))]
    pub model: Option<String>,
    
    #[validate(length(max = "255"))]
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

#[derive(Debug, Deserialize, Validate)]
pub struct ExecuteSkillRequest {
    pub params: Option<serde_json::Value>,
    
    #[validate]
    pub context: Option<CodeContext>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct CodeContext {
    #[validate(length(max = "1000"))]
    pub file_path: Option<String>,
    
    #[validate(length(max = "MAX_STRING_LENGTH"))]
    pub code: Option<String>,
    
    #[validate(length(max = "50"))]
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
    Extension(database): Extension<Option<Arc<Database>>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Try to get from database first
    if let Some(ref db) = database {
        match sqlx::query_as::<_, crate::database::models::OpenClawSession>(
            "SELECT * FROM openclaw_sessions ORDER BY created_at DESC LIMIT 100"
        )
        .fetch_all(db.pool())
        .await
        {
            Ok(sessions) => {
                let session_data: Vec<serde_json::Value> = sessions
                    .into_iter()
                    .map(|s| serde_json::json!({
                        "id": s.session_id,
                        "channel": s.channel,
                        "status": s.status,
                        "model": s.model,
                        "created_at": s.created_at.to_rfc3339()
                    }))
                    .collect();
                
                return Ok(Json(serde_json::json!({
                    "sessions": session_data,
                    "total": session_data.len()
                })));
            }
            Err(e) => {
                tracing::warn!("Failed to fetch sessions from database: {}", e);
            }
        }
    }

    // Fallback: In production, this would query the Gateway
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
    Extension(database): Extension<Option<Arc<Database>>>,
    Json(request): Json<SendMessageRequest>,
) -> Result<Json<MessageResponse>, StatusCode> {
    use chrono::Utc;
    use uuid::Uuid;

    // Validate input
    request.validate()
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    // Sanitize message
    let sanitized_message = sanitize_string(&request.message, MAX_STRING_LENGTH);
    
    // Log to database if available
    if let Some(ref db) = database {
        if let Some(ref session_id) = request.session_id {
            // Could log message to database here
            let _ = db.pool().execute(
                sqlx::query("UPDATE openclaw_sessions SET updated_at = NOW() WHERE session_id = $1")
                    .bind(session_id)
            ).await;
        }
    }

    // In production, this would send to the Gateway
    // For now, return a mock response
    Ok(Json(MessageResponse {
        id: Uuid::new_v4().to_string(),
        role: "assistant".to_string(),
        content: format!(
            "OpenClaw integration is configured. Message received: {}",
            sanitized_message
        ),
        timestamp: Utc::now().to_rfc3339(),
        model: request.model,
    }))
}

/// List available skills
pub async fn list_skills(
    Extension(_config): Extension<Config>,
    Extension(database): Extension<Option<Arc<Database>>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Try to get from database first
    if let Some(ref db) = database {
        match sqlx::query_as::<_, crate::database::models::OpenClawSkill>(
            "SELECT * FROM openclaw_skills WHERE enabled = true ORDER BY name"
        )
        .fetch_all(db.pool())
        .await
        {
            Ok(db_skills) => {
                let skills_data: Vec<serde_json::Value> = db_skills
                    .into_iter()
                    .map(|s| serde_json::json!({
                        "name": s.name,
                        "description": s.description,
                        "skill_type": s.skill_type,
                        "enabled": s.enabled,
                        "capabilities": s.capabilities
                    }))
                    .collect();
                
                return Ok(Json(serde_json::json!({
                    "skills": skills_data,
                    "total": skills_data.len()
                })));
            }
            Err(e) => {
                tracing::warn!("Failed to fetch skills from database: {}", e);
            }
        }
    }

    // Fallback to hardcoded skills
    let skills = get_bloop_skills();
    
    Ok(Json(serde_json::json!({
        "skills": skills,
        "total": skills.len()
    })))
}

/// Execute a skill
pub async fn execute_skill(
    Extension(_config): Extension<Config>,
    Extension(database): Extension<Option<Arc<Database>>>,
    Path(skill_name): Path<String>,
    Json(request): Json<ExecuteSkillRequest>,
) -> Result<Json<SkillResult>, StatusCode> {
    use chrono::Utc;
    use uuid::Uuid;

    // Validate skill name
    let validated_name = validate_skill_name(&skill_name)
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    // Validate request
    request.validate()
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    // Sanitize context if present
    let sanitized_context = request.context.map(|ctx| CodeContext {
        file_path: ctx.file_path.map(|p| sanitize_string(&p, 1000)),
        code: ctx.code.map(|c| sanitize_string(&c, MAX_STRING_LENGTH)),
        language: ctx.language.map(|l| sanitize_string(&l, 50)),
    });

    // Find the skill
    let skills = get_bloop_skills();
    let skill = skills.iter().find(|s| s.name == validated_name);

    let start_time = std::time::Instant::now();

    let result = match skill {
        Some(s) => {
            // In production, execute the skill via Gateway
            // For now, return mock result
            SkillResult {
                success: true,
                output: Some(format!(
                    "Executed skill '{}' successfully",
                    s.name
                )),
                error: None,
                duration: Some(start_time.elapsed().as_millis() as u64),
            }
        }
        None => {
            SkillResult {
                success: false,
                output: None,
                error: Some(format!("Skill '{}' not found", validated_name)),
                duration: None,
            }
        }
    };

    // Log execution to database if available
    if let Some(ref db) = database {
        let _ = sqlx::query(
            "INSERT INTO openclaw_executions (skill_name, success, output, error, duration_ms, params, context)
             VALUES ($1, $2, $3, $4, $5, $6, $7)"
        )
        .bind(&validated_name)
        .bind(result.success)
        .bind(result.output.as_ref())
        .bind(result.error.as_ref())
        .bind(result.duration.map(|d| d as i32))
        .bind(&request.params)
        .bind(&sanitized_context.as_ref().map(|c| serde_json::to_value(c).ok()).flatten())
        .execute(db.pool())
        .await;
    }

    Ok(Json(result))
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
