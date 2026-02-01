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
use validator::Validate;
use std::sync::Arc;
use crate::config::Config;
use crate::database::Database;
use crate::middleware::security::{sanitize_string, MAX_STRING_LENGTH};

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

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterAgentRequest {
    #[validate(length(max = "100"))]
    pub agent_name: Option<String>,
    
    #[validate(length(max = "MAX_STRING_LENGTH"))]
    pub description: Option<String>,
    
    #[validate(length(max = "50"))]
    pub capabilities: Option<Vec<String>>,
    
    #[validate(length(max = "50"))]
    pub twitter_handle: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ClaimLink {
    pub url: String,
    pub code: String,
    pub expires_at: String,
    pub agent_id: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ShareCodeRequest {
    #[validate(length(min = 1, max = "500"))]
    pub title: String,
    
    #[validate(length(min = 1, max = "MAX_STRING_LENGTH"))]
    pub code: String,
    
    #[validate(length(max = "50"))]
    pub language: String,
    
    #[validate(length(max = "MAX_STRING_LENGTH"))]
    pub description: Option<String>,
    
    #[validate(length(max = "100"))]
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
    Extension(database): Extension<Option<Arc<Database>>>,
) -> Result<Json<MoltbookStatus>, StatusCode> {
    let enabled = std::env::var("MOLTBOOK_ENABLED")
        .map(|v| v == "true")
        .unwrap_or(false);

    // Check database for registration status
    if let Some(ref db) = database {
        if let Ok(agent) = sqlx::query_as::<_, crate::database::models::MoltbookAgent>(
            "SELECT * FROM moltbook_agents WHERE username = 'bloop' LIMIT 1"
        )
        .fetch_optional(db.pool())
        .await
        {
            if let Some(agent) = agent {
                return Ok(Json(MoltbookStatus {
                    enabled,
                    registered: true,
                    agent_id: Some(agent.agent_id),
                    username: Some(agent.username),
                    karma: agent.karma as u32,
                }));
            }
        }
    }

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
    Extension(database): Extension<Option<Arc<Database>>>,
) -> Result<Json<Option<MoltbookAgent>>, StatusCode> {
    // Try database first
    if let Some(ref db) = database {
        if let Ok(Some(agent)) = sqlx::query_as::<_, crate::database::models::MoltbookAgent>(
            "SELECT * FROM moltbook_agents WHERE username = 'bloop' LIMIT 1"
        )
        .fetch_optional(db.pool())
        .await
        {
            return Ok(Json(Some(MoltbookAgent {
                id: agent.agent_id,
                username: agent.username,
                display_name: agent.display_name,
                description: agent.description.unwrap_or_default(),
                karma: agent.karma as u32,
                verified: agent.verified,
                capabilities: agent.capabilities,
                submolts: agent.submolts,
            })));
        }
    }

    // Fallback: return Bloop's default profile
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
    Extension(database): Extension<Option<Arc<Database>>>,
    Json(request): Json<RegisterAgentRequest>,
) -> Result<Json<ClaimLink>, StatusCode> {
    use chrono::{Utc, Duration};
    use uuid::Uuid;

    // Validate input
    request.validate()
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    let agent_name = request.agent_name
        .map(|n| sanitize_string(&n, 100))
        .unwrap_or_else(|| "Bloop".to_string());
    
    let description = request.description
        .map(|d| sanitize_string(&d, MAX_STRING_LENGTH))
        .unwrap_or_else(|| "AI-powered development environment".to_string());

    let code = format!("BLOOP-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let agent_id = format!("agent_{}", Uuid::new_v4());
    let expires_at = (Utc::now() + Duration::hours(24)).to_rfc3339();

    // Save to database if available
    if let Some(ref db) = database {
        let mut tx = db.begin().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        let _ = sqlx::query(
            "INSERT INTO moltbook_agents (agent_id, username, display_name, description, capabilities)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (agent_id) DO NOTHING"
        )
        .bind(&agent_id)
        .bind("bloop")
        .bind(&agent_name)
        .bind(&description)
        .bind(&request.capabilities.unwrap_or_default())
        .execute(&mut *tx)
        .await;

        tx.commit().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

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
    Extension(database): Extension<Option<Arc<Database>>>,
    Json(request): Json<ShareCodeRequest>,
) -> Result<Json<MoltbookPost>, StatusCode> {
    use chrono::Utc;
    use uuid::Uuid;

    // Validate input
    request.validate()
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    // Sanitize inputs
    let title = sanitize_string(&request.title, 500);
    let code = sanitize_string(&request.code, MAX_STRING_LENGTH);
    let language = sanitize_string(&request.language, 50);
    let description = request.description.map(|d| sanitize_string(&d, MAX_STRING_LENGTH));
    let submolt = request.submolt
        .map(|s| sanitize_string(&s, 100))
        .unwrap_or_else(|| "coding".to_string());

    let content = if let Some(desc) = description {
        format!("{}\n\n```{}\n{}\n```", desc, language, code)
    } else {
        format!("```{}\n{}\n```", language, code)
    };

    let post_id = Uuid::new_v4().to_string();

    // Save to database if available
    if let Some(ref db) = database {
        // Get Bloop's agent ID
        if let Ok(Some(agent)) = sqlx::query_as::<_, crate::database::models::MoltbookAgent>(
            "SELECT * FROM moltbook_agents WHERE username = 'bloop' LIMIT 1"
        )
        .fetch_optional(db.pool())
        .await
        {
            let mut tx = db.begin().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            let _ = sqlx::query(
                "INSERT INTO moltbook_posts (post_id, author_id, submolt, title, content, content_type, language)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)"
            )
            .bind(&post_id)
            .bind(agent.id)
            .bind(&submolt)
            .bind(&title)
            .bind(&content)
            .bind("code")
            .bind(&language)
            .execute(&mut *tx)
            .await;

            tx.commit().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }
    }

    // In production, post to Moltbook API
    Ok(Json(MoltbookPost {
        id: post_id,
        title,
        content,
        submolt,
        karma: 0,
        created_at: Utc::now().to_rfc3339(),
    }))
}

/// Get trending skills from Moltbook
pub async fn get_trending_skills(
    Extension(_config): Extension<Config>,
    Extension(database): Extension<Option<Arc<Database>>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Try database first
    if let Some(ref db) = database {
        match sqlx::query_as::<_, crate::database::models::MoltbookSkill>(
            "SELECT * FROM moltbook_skills ORDER BY rating DESC, downloads DESC LIMIT 20"
        )
        .fetch_all(db.pool())
        .await
        {
            Ok(skills) => {
                let skills_data: Vec<serde_json::Value> = skills
                    .into_iter()
                    .map(|s| serde_json::json!({
                        "id": s.skill_id,
                        "name": s.name,
                        "description": s.description,
                        "version": s.version,
                        "downloads": s.downloads,
                        "rating": s.rating.to_string().parse::<f64>().unwrap_or(0.0),
                        "rating_count": s.rating_count,
                        "tags": s.tags
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

    // Fallback: In production, fetch from Moltbook API
    Ok(Json(serde_json::json!({
        "skills": [],
        "total": 0
    })))
}

/// Get feed from Moltbook
pub async fn get_feed(
    Extension(_config): Extension<Config>,
    Extension(database): Extension<Option<Arc<Database>>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Try database first
    if let Some(ref db) = database {
        match sqlx::query_as::<_, crate::database::models::MoltbookPost>(
            "SELECT p.* FROM moltbook_posts p
             ORDER BY p.karma DESC, p.created_at DESC
             LIMIT 25"
        )
        .fetch_all(db.pool())
        .await
        {
            Ok(posts) => {
                let posts_data: Vec<serde_json::Value> = posts
                    .into_iter()
                    .map(|p| serde_json::json!({
                        "id": p.post_id,
                        "title": p.title,
                        "content": p.content,
                        "submolt": p.submolt,
                        "karma": p.karma,
                        "created_at": p.created_at.to_rfc3339()
                    }))
                    .collect();
                
                return Ok(Json(serde_json::json!({
                    "posts": posts_data,
                    "has_more": posts_data.len() >= 25,
                    "next_offset": posts_data.len()
                })));
            }
            Err(e) => {
                tracing::warn!("Failed to fetch feed from database: {}", e);
            }
        }
    }

    // Fallback: In production, fetch from Moltbook API
    Ok(Json(serde_json::json!({
        "posts": [],
        "has_more": false,
        "next_offset": 0
    })))
}
