/**
 * Agent Executor - Executes agent tasks using AI models
 * 
 * Integrates with the AI router from Phase 1 to execute tasks
 */
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;

use crate::types::{AgentTask, TaskType, TaskStatus, AIMessage, MessageRole};
use crate::services::ai::router::ModelRouter;
use crate::config::Config;
use super::types::{Agent, AgentStatus, AgentExecutionResult, Artifact, ArtifactType};
pub struct AgentExecutor {
    router: Arc<ModelRouter>,
    config: Arc<Config>,
}

impl AgentExecutor {
    pub fn new(
        router: Arc<ModelRouter>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            router,
            config,
        }
    }

    /// Execute a task with an agent
    pub async fn execute_task(
        &self,
        agent: Agent,
        mut task: AgentTask,
    ) -> AgentExecutionResult {
        let start_time = std::time::Instant::now();

        // Update task status
        task.status = TaskStatus::Processing;

        // Build AI prompt based on task type and agent type
        let prompt = self.build_prompt(&agent, &task);
        
        // Select appropriate model for this task
        let model_selection = self.select_model_for_task(&task, &agent);

        // Execute with AI
        let result = match self.execute_with_ai(&prompt, model_selection).await {
            Ok(response) => {
                task.status = TaskStatus::Completed;
                task.result = Some(response.content.clone());
                task.completed_at = Some(chrono::Utc::now());

                // Create artifacts from result
                let artifacts = self.create_artifacts(&task, &response.content);

                AgentExecutionResult {
                    agent_id: agent.id.clone(),
                    task_id: task.id.clone(),
                    success: true,
                    result: Some(response.content),
                    error: None,
                    artifacts,
                    execution_time_ms: start_time.elapsed().as_millis() as u64,
                    tokens_used: response.usage.map(|u| u.total_tokens),
                }
            }
            Err(e) => {
                task.status = TaskStatus::Failed;
                task.error = Some(e.clone());
                task.completed_at = Some(chrono::Utc::now());

                AgentExecutionResult {
                    agent_id: agent.id.clone(),
                    task_id: task.id.clone(),
                    success: false,
                    result: None,
                    error: Some(e),
                    artifacts: vec![],
                    execution_time_ms: start_time.elapsed().as_millis() as u64,
                    tokens_used: None,
                }
            }
        }
    }

    fn build_prompt(&self, agent: &Agent, task: &AgentTask) -> String {
        let agent_role = match agent.agent_type {
            super::types::AgentType::CodeGenerator => "You are a code generation agent. Generate clean, efficient, and well-documented code.",
            super::types::AgentType::CodeAnalyzer => "You are a code analysis agent. Analyze code for quality, patterns, and potential issues.",
            super::types::AgentType::Refactorer => "You are a refactoring agent. Improve code structure, readability, and maintainability.",
            super::types::AgentType::Debugger => "You are a debugging agent. Find and fix bugs in code.",
            super::types::AgentType::Documenter => "You are a documentation agent. Generate comprehensive documentation for code.",
            super::types::AgentType::Tester => "You are a testing agent. Generate comprehensive test suites for code.",
            super::types::AgentType::Reviewer => "You are a code review agent. Review code and provide constructive feedback.",
            super::types::AgentType::Optimizer => "You are an optimization agent. Optimize code for performance.",
            super::types::AgentType::Security => "You are a security agent. Find and fix security vulnerabilities.",
            super::types::AgentType::Migrator => "You are a migration agent. Help migrate code between frameworks or versions.",
        };

        format!(
            "{}\n\nTask: {}\n\nContext: {:?}\n\nPlease complete this task with high quality.",
            agent_role,
            task.description,
            task.context
        )
    }

    fn select_model_for_task(&self, task: &AgentTask, agent: &Agent) -> Option<String> {
        // Use intelligent model selection based on task type
        // For now, return None to let router auto-select
        // In future, we can add task-specific model preferences
        None
    }

    async fn execute_with_ai(
        &self,
        prompt: &str,
        model: Option<String>,
    ) -> Result<crate::types::AIResponse, String> {
        use crate::services::ai::base::AIService;

        let messages = vec![AIMessage {
            role: MessageRole::User,
            content: prompt.to_string(),
            timestamp: Some(chrono::Utc::now()),
            metadata: None,
        }];

        let request = crate::types::AIRequest {
            messages,
            model,
            temperature: Some(0.7),
            max_tokens: Some(4000),
            stream: Some(false),
            context: None,
        };

        // Use the router to get the best service
        use crate::services::ai::base::AIService;
        
        let model_info = self.router.select_best_model(&request)
            .map_err(|e| format!("Model selection failed: {}", e))?;
        
        let service = self.router.get_service(model_info.provider)
            .ok_or_else(|| "No service available".to_string())?;
        
        match service.generate(&request).await {
            Ok(response) => Ok(response),
            Err(e) => Err(format!("AI execution failed: {}", e)),
        }
    }

    fn create_artifacts(&self, task: &AgentTask, result: &str) -> Vec<Artifact> {
        let artifact_type = match task.r#type {
            TaskType::CodeGeneration => ArtifactType::Code,
            TaskType::Refactoring => ArtifactType::Refactoring,
            TaskType::Debugging => ArtifactType::Fix,
            TaskType::Testing => ArtifactType::Test,
            TaskType::Documentation => ArtifactType::Documentation,
            TaskType::CodeAnalysis => ArtifactType::Analysis,
        };

        vec![Artifact {
            artifact_type,
            content: result.to_string(),
            metadata: Some({
                let mut meta = HashMap::new();
                meta.insert("task_id".to_string(), serde_json::Value::String(task.id.clone()));
                meta.insert("task_type".to_string(), serde_json::json!(task.r#type));
                meta
            }),
        }]
    }

}

// Clone implementation for Arc
impl Clone for AgentExecutor {
    fn clone(&self) -> Self {
        Self {
            router: Arc::clone(&self.router),
            config: Arc::clone(&self.config),
        }
    }
}
