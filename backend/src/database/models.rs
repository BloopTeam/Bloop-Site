/**
 * Database models for OpenClaw and Moltbook
 */
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// OpenClaw Models

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OpenClawSession {
    pub id: Uuid,
    pub session_id: String,
    pub channel: String,
    pub status: String,
    pub model: Option<String>,
    pub thinking_level: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OpenClawSkill {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub skill_type: String,
    pub enabled: bool,
    pub capabilities: Vec<String>,
    pub version: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OpenClawExecution {
    pub id: Uuid,
    pub skill_name: String,
    pub session_id: Option<Uuid>,
    pub success: bool,
    pub output: Option<String>,
    pub error: Option<String>,
    pub duration_ms: Option<i32>,
    pub params: Option<serde_json::Value>,
    pub context: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

// Moltbook Models

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MoltbookAgent {
    pub id: Uuid,
    pub agent_id: String,
    pub username: String,
    pub display_name: String,
    pub description: Option<String>,
    pub avatar_url: Option<String>,
    pub karma: i32,
    pub verified: bool,
    pub capabilities: Vec<String>,
    pub submolts: Vec<String>,
    pub auth_token_hash: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MoltbookPost {
    pub id: Uuid,
    pub post_id: String,
    pub author_id: Uuid,
    pub submolt: String,
    pub title: String,
    pub content: String,
    pub content_type: String,
    pub language: Option<String>,
    pub karma: i32,
    pub upvotes: i32,
    pub downvotes: i32,
    pub comment_count: i32,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MoltbookSkill {
    pub id: Uuid,
    pub skill_id: String,
    pub name: String,
    pub description: String,
    pub author_id: Uuid,
    pub version: String,
    pub downloads: i32,
    pub rating: rust_decimal::Decimal,
    pub rating_count: i32,
    pub skill_md: String,
    pub repository_url: Option<String>,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
