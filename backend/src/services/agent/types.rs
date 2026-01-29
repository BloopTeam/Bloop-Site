/**
 * Agent types and structures
 */
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::types::{AgentTask, TaskType, Priority, TaskStatus, CodebaseContext};

/// Represents a single agent instance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub agent_type: AgentType,
    pub status: AgentStatus,
    pub current_task: Option<String>, // Task ID
    pub capabilities: Vec<Capability>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

/// Specialized agent types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum AgentType {
    /// Code generation agent - writes new code
    CodeGenerator,
    /// Code analysis agent - analyzes code quality and patterns
    CodeAnalyzer,
    /// Refactoring agent - improves code structure
    Refactorer,
    /// Debugging agent - finds and fixes bugs
    Debugger,
    /// Documentation agent - generates documentation
    Documenter,
    /// Testing agent - generates and runs tests
    Tester,
    /// Review agent - reviews code and provides feedback
    Reviewer,
    /// Optimization agent - optimizes performance
    Optimizer,
    /// Security agent - finds security vulnerabilities
    Security,
    /// Migration agent - helps migrate between frameworks
    Migrator,
}

/// Agent status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AgentStatus {
    Idle,
    Working,
    Waiting, // Waiting for another agent's result
    Completed,
    Failed,
}

/// Agent capabilities
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Capability {
    ReadCode,
    WriteCode,
    AnalyzeCode,
    RunTests,
    AccessFilesystem,
    MakeApiCalls,
    UseAiModels,
}

/// Agent communication message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    pub from: String, // Agent ID
    pub to: Option<String>, // Agent ID (None = broadcast)
    pub message_type: MessageType,
    pub content: String,
    pub data: Option<HashMap<String, serde_json::Value>>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    TaskRequest,
    TaskResult,
    DataRequest,
    DataResponse,
    Coordination,
    Error,
}

/// Task decomposition result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecomposedTask {
    pub original_task: AgentTask,
    pub subtasks: Vec<SubTask>,
    pub dependencies: Vec<TaskDependency>,
}

/// Sub-task within a decomposed task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubTask {
    pub id: String,
    pub parent_id: String, // Original task ID
    pub description: String,
    pub task_type: TaskType,
    pub priority: Priority,
    pub assigned_agent_type: Option<AgentType>,
    pub dependencies: Vec<String>, // Other subtask IDs this depends on
    pub context: CodebaseContext,
}

/// Task dependency relationship
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskDependency {
    pub task_id: String,
    pub depends_on: Vec<String>, // Task IDs this task depends on
    pub dependency_type: DependencyType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DependencyType {
    Sequential, // Must complete in order
    Parallel,   // Can run simultaneously
    Conditional, // Depends on result of another task
}

/// Agent execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentExecutionResult {
    pub agent_id: String,
    pub task_id: String,
    pub success: bool,
    pub result: Option<String>,
    pub error: Option<String>,
    pub artifacts: Vec<Artifact>,
    pub execution_time_ms: u64,
    pub tokens_used: Option<u32>,
}

/// Artifact produced by an agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Artifact {
    pub artifact_type: ArtifactType,
    pub content: String,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ArtifactType {
    Code,
    Test,
    Documentation,
    Analysis,
    Refactoring,
    Fix,
}

impl Agent {
    pub fn new(id: String, name: String, agent_type: AgentType) -> Self {
        Self {
            id,
            name,
            agent_type,
            status: AgentStatus::Idle,
            current_task: None,
            capabilities: Self::capabilities_for_type(&agent_type),
            created_at: chrono::Utc::now(),
            metadata: None,
        }
    }

    fn capabilities_for_type(agent_type: &AgentType) -> Vec<Capability> {
        match agent_type {
            AgentType::CodeGenerator => vec![
                Capability::ReadCode,
                Capability::WriteCode,
                Capability::UseAiModels,
            ],
            AgentType::CodeAnalyzer => vec![
                Capability::ReadCode,
                Capability::AnalyzeCode,
                Capability::UseAiModels,
            ],
            AgentType::Refactorer => vec![
                Capability::ReadCode,
                Capability::WriteCode,
                Capability::AnalyzeCode,
                Capability::UseAiModels,
            ],
            AgentType::Debugger => vec![
                Capability::ReadCode,
                Capability::WriteCode,
                Capability::AnalyzeCode,
                Capability::RunTests,
                Capability::UseAiModels,
            ],
            AgentType::Documenter => vec![
                Capability::ReadCode,
                Capability::WriteCode,
                Capability::UseAiModels,
            ],
            AgentType::Tester => vec![
                Capability::ReadCode,
                Capability::WriteCode,
                Capability::RunTests,
                Capability::UseAiModels,
            ],
            AgentType::Reviewer => vec![
                Capability::ReadCode,
                Capability::AnalyzeCode,
                Capability::UseAiModels,
            ],
            AgentType::Optimizer => vec![
                Capability::ReadCode,
                Capability::WriteCode,
                Capability::AnalyzeCode,
                Capability::UseAiModels,
            ],
            AgentType::Security => vec![
                Capability::ReadCode,
                Capability::AnalyzeCode,
                Capability::UseAiModels,
            ],
            AgentType::Migrator => vec![
                Capability::ReadCode,
                Capability::WriteCode,
                Capability::AnalyzeCode,
                Capability::UseAiModels,
            ],
        }
    }

    pub fn can_handle_task(&self, task_type: &TaskType) -> bool {
        match (&self.agent_type, task_type) {
            (AgentType::CodeGenerator, TaskType::CodeGeneration) => true,
            (AgentType::CodeAnalyzer, TaskType::CodeAnalysis) => true,
            (AgentType::Refactorer, TaskType::Refactoring) => true,
            (AgentType::Debugger, TaskType::Debugging) => true,
            (AgentType::Documenter, TaskType::Documentation) => true,
            (AgentType::Tester, TaskType::Testing) => true,
            _ => false,
        }
    }
}
