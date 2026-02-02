/**
 * Agent Company Types
 */
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use crate::services::agent::types::{Agent, AgentType, AgentStatus};
use crate::types::{AgentTask, Priority, TaskType};

/// Company role/position for agents
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum CompanyRole {
    /// CEO - Strategic planning and high-level decisions
    Ceo,
    /// CTO - Technical architecture and technology decisions
    Cto,
    /// Product Manager - Feature planning and prioritization
    ProductManager,
    /// Backend Engineer - Server-side development
    BackendEngineer,
    /// Frontend Engineer - Client-side development
    FrontendEngineer,
    /// DevOps Engineer - Infrastructure and deployment
    DevOpsEngineer,
    /// QA Engineer - Testing and quality assurance
    QaEngineer,
    /// UI Designer - User interface design
    UiDesigner,
    /// UX Designer - User experience design
    UxDesigner,
    /// Visual Designer - Visual assets and graphics
    VisualDesigner,
    /// Content Creator - Content generation
    ContentCreator,
    /// Documentation Specialist - Documentation writing
    DocumentationSpecialist,
    /// Customer Support - User assistance
    CustomerSupport,
}

/// Agent company member
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyMember {
    pub agent: Agent,
    pub role: CompanyRole,
    pub team: String,
    pub skills: Vec<String>,
    pub performance_score: f64,
    pub tasks_completed: u64,
    pub tasks_failed: u64,
    pub average_task_time_ms: u64,
    pub last_active: DateTime<Utc>,
    pub is_active: bool,
    pub openclaw_id: Option<String>, // OpenClaw agent ID
    pub moltbook_id: Option<String>, // Moltbook agent ID
}

/// Company team structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Team {
    pub name: String,
    pub members: Vec<String>, // Agent IDs
    pub lead: Option<String>, // Agent ID of team lead
    pub capacity: usize,
    pub current_load: usize,
}

/// Demand analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemandAnalysis {
    pub total_demand: u32,
    pub urgent_tasks: u32,
    pub high_priority_tasks: u32,
    pub medium_priority_tasks: u32,
    pub low_priority_tasks: u32,
    pub demand_by_type: HashMap<TaskType, u32>,
    pub demand_by_role: HashMap<CompanyRole, u32>,
    pub estimated_completion_time: Option<u64>, // milliseconds
    pub resource_requirements: ResourceRequirements,
}

/// Resource requirements for demand
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceRequirements {
    pub agents_needed: HashMap<CompanyRole, usize>,
    pub estimated_tokens: u64,
    pub estimated_time_ms: u64,
    pub visual_assets_needed: bool,
    pub collaboration_needed: bool,
}

/// Visual creative request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualCreativeRequest {
    pub id: String,
    pub request_type: VisualCreativeType,
    pub description: String,
    pub requirements: HashMap<String, serde_json::Value>,
    pub priority: Priority,
    pub assigned_agent: Option<String>,
    pub status: VisualCreativeStatus,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub result: Option<VisualCreativeResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VisualCreativeType {
    ImageGeneration,
    UiMockup,
    IconDesign,
    LogoDesign,
    Illustration,
    BannerDesign,
    AssetOptimization,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VisualCreativeStatus {
    Pending,
    InProgress,
    Review,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualCreativeResult {
    pub asset_url: String,
    pub asset_type: String,
    pub metadata: HashMap<String, serde_json::Value>,
    pub generation_time_ms: u64,
}

/// Company metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyMetrics {
    pub total_agents: usize,
    pub active_agents: usize,
    pub total_tasks_completed: u64,
    pub total_tasks_failed: u64,
    pub success_rate: f64,
    pub average_task_time_ms: u64,
    pub total_tokens_used: u64,
    pub uptime_seconds: u64,
    pub visual_creatives_completed: u64,
    pub collaborations_count: u64,
    pub last_updated: DateTime<Utc>,
}

/// Agent collaboration request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollaborationRequest {
    pub id: String,
    pub from_agent: String,
    pub to_agents: Vec<String>,
    pub task: String,
    pub context: HashMap<String, serde_json::Value>,
    pub priority: Priority,
    pub status: CollaborationStatus,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub result: Option<CollaborationResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CollaborationStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollaborationResult {
    pub participants: Vec<String>,
    pub output: String,
    pub artifacts: Vec<String>,
    pub duration_ms: u64,
}
