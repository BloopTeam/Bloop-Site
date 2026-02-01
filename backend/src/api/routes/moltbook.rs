/**
 * Moltbook API route handlers
 * Provides API endpoints for Moltbook social network integration
 */
use axum::{
    extract::Extension,
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use crate::config::Config;

// Types for Moltbook integration

#[derive(Debug, Serialize)]
pub struct MoltbookStatus {
    pub enabled: bool,
    pub registered: bool,
    pub agent_id: Option<String>,
    pub username: Option<String>,
    pub karma: u32,
}

#[derive(Debug, Serialize)]
pub struct MoltbookAgent {
    pub id: String,
    pub username: String,
    pub display_name: String,
    pub description: String,
    pub karma: u32,
    pub verified: bool,
    pub capabilities: Vec<String>,
    pub submolts: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterAgentRequest {
    pub agent_name: Option<String>,
    pub description: Option<String>,
    pub capabilities: Option<Vec<String>>,
    pub twitter_handle: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ClaimLink {
    pub url: String,
    pub code: String,
    pub expires_at: String,
    pub agent_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ShareCodeRequest {
    pub title: String,
    pub code: String,
    pub language: String,
    pub description: Option<String>,
    pub submolt: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MoltbookPost {
    pub id: String,
    pub title: String,
    pub content: String,
    pub submolt: String,
    pub karma: i32,
    pub created_at: String,
}

/// Get Moltbook integration status
pub async fn get_status(
    Extension(_config): Extension<Config>,
) -> Result<Json<MoltbookStatus>, StatusCode> {
    let enabled = std::env::var("MOLTBOOK_ENABLED")
        .map(|v| v == "true")
        .unwrap_or(false);

    // In production, check actual registration status
    Ok(Json(MoltbookStatus {
        enabled,
        registered: false,
        agent_id: None,
        username: None,
        karma: 0,
    }))
}

/// Get Bloop's agent profile
pub async fn get_profile(
    Extension(_config): Extension<Config>,
) -> Result<Json<Option<MoltbookAgent>>, StatusCode> {
    // In production, fetch from Moltbook API or cache
    // For now, return Bloop's default profile
    Ok(Json(Some(MoltbookAgent {
        id: "bloop-agent".to_string(),
        username: "bloop".to_string(),
        display_name: "Bloop".to_string(),
        description: "AI-powered development environment with advanced code intelligence".to_string(),
        karma: 0,
        verified: false,
        capabilities: vec![
            "code-generation".to_string(),
            "code-review".to_string(),
            "test-generation".to_string(),
            "documentation".to_string(),
            "refactoring".to_string(),
            "debugging".to_string(),
        ],
        submolts: vec![
            "developers".to_string(),
            "coding".to_string(),
            "ai-tools".to_string(),
        ],
    })))
}

/// Register Bloop as an agent on Moltbook
pub async fn register_agent(
    Extension(_config): Extension<Config>,
    Json(request): Json<RegisterAgentRequest>,
) -> Result<Json<ClaimLink>, StatusCode> {
    use chrono::{Utc, Duration};
    use uuid::Uuid;

    let agent_name = request.agent_name.unwrap_or_else(|| "Bloop".to_string());
    let code = format!("BLOOP-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let agent_id = format!("agent_{}", Uuid::new_v4());
    let expires_at = (Utc::now() + Duration::hours(24)).to_rfc3339();

    // In production, this would call Moltbook API
    Ok(Json(ClaimLink {
        url: format!("https://moltbook.com/claim/{}", code),
        code,
        expires_at,
        agent_id,
    }))
}

/// Share code to Moltbook
pub async fn share_code(
    Extension(_config): Extension<Config>,
    Json(request): Json<ShareCodeRequest>,
) -> Result<Json<MoltbookPost>, StatusCode> {
    use chrono::Utc;
    use uuid::Uuid;

    let submolt = request.submolt.unwrap_or_else(|| "coding".to_string());
    let content = if let Some(desc) = request.description {
        format!("{}\n\n```{}\n{}\n```", desc, request.language, request.code)
    } else {
        format!("```{}\n{}\n```", request.language, request.code)
    };

    // In production, post to Moltbook API
    Ok(Json(MoltbookPost {
        id: Uuid::new_v4().to_string(),
        title: request.title,
        content,
        submolt,
        karma: 0,
        created_at: Utc::now().to_rfc3339(),
    }))
}

/// Get trending skills from Moltbook
pub async fn get_trending_skills(
    Extension(_config): Extension<Config>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // In production, fetch from Moltbook API
    Ok(Json(serde_json::json!({
        "skills": [],
        "total": 0
    })))
}

/// Get feed from Moltbook
pub async fn get_feed(
    Extension(_config): Extension<Config>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // In production, fetch from Moltbook API
    Ok(Json(serde_json::json!({
        "posts": [],
        "has_more": false,
        "next_offset": 0
    })))
}
