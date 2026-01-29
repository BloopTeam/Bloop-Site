/**
 * Agent Execution Timeout
 * 
 * Prevents agents from running indefinitely
 */
use tokio::time::{timeout, Duration};
use crate::services::agent::executor::AgentExecutor;
use crate::services::agent::types::{Agent, AgentExecutionResult, AgentTask};

/// Default timeout for agent execution
pub const DEFAULT_AGENT_TIMEOUT: Duration = Duration::from_secs(300); // 5 minutes

/// Execute agent task with timeout
pub async fn execute_with_timeout(
    executor: &AgentExecutor,
    agent: Agent,
    task: AgentTask,
    timeout_duration: Duration,
) -> Result<AgentExecutionResult, String> {
    match timeout(timeout_duration, executor.execute_task(agent, task)).await {
        Ok(result) => Ok(result),
        Err(_) => {
            tracing::warn!("Agent execution timed out after {:?}", timeout_duration);
            Err(format!("Agent execution timed out after {:?}", timeout_duration))
        }
    }
}

/// Get timeout duration based on task type
pub fn get_timeout_for_task(task_type: &crate::types::TaskType) -> Duration {
    match task_type {
        crate::types::TaskType::CodeGeneration => Duration::from_secs(300), // 5 min
        crate::types::TaskType::Refactoring => Duration::from_secs(600), // 10 min
        crate::types::TaskType::Debugging => Duration::from_secs(300), // 5 min
        crate::types::TaskType::Testing => Duration::from_secs(180), // 3 min
        crate::types::TaskType::Documentation => Duration::from_secs(120), // 2 min
        crate::types::TaskType::CodeAnalysis => Duration::from_secs(180), // 3 min
    }
}
