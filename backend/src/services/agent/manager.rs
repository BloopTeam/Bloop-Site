/**
 * Agent Manager - Orchestrates multiple agents
 * 
 * Manages agent lifecycle, task assignment, and coordination
 */
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::types::{AgentTask, TaskType, TaskStatus};
use super::types::{Agent, AgentType, AgentStatus, AgentMessage, MessageType};
use super::decomposer::TaskDecomposer;
use super::executor::AgentExecutor;
use super::security::{
    AgentSecurityConfig, validate_task_description, validate_context,
    validate_agent_count, validate_task_count, sanitize_task_description,
};
use super::monitoring::MetricsCollector;
use super::fault_tolerance::{CircuitBreaker, HealthMonitor, CheckpointManager, RetryConfig, execute_with_retry};
use super::queue::{TaskQueue, BackpressureManager};
use crate::services::ai::router::ModelRouter;
use crate::config::Config;

pub struct AgentManager {
    agents: Arc<RwLock<HashMap<String, Agent>>>,
    tasks: Arc<RwLock<HashMap<String, AgentTask>>>,
    executor: Arc<AgentExecutor>,
    security_config: AgentSecurityConfig,
    metrics: Arc<MetricsCollector>,
    task_queue: Arc<TaskQueue>,
    backpressure: Arc<BackpressureManager>,
    circuit_breaker: Arc<CircuitBreaker>,
    health_monitor: Arc<HealthMonitor>,
    checkpoint_manager: Arc<CheckpointManager>,
}

impl AgentManager {
    pub fn new(router: Arc<ModelRouter>, config: Arc<Config>) -> Self {
        let executor = Arc::new(AgentExecutor::new(router, config));
        let security_config = AgentSecurityConfig::default();
        
        // Initialize fault tolerance systems
        let task_queue = Arc::new(TaskQueue::new(2000)); // 2x capacity for buffer
        let backpressure = Arc::new(BackpressureManager::new(200)); // Max 200 concurrent tasks
        let circuit_breaker = Arc::new(CircuitBreaker::new(
            5, // Open after 5 failures
            std::time::Duration::from_secs(60), // Timeout 60 seconds
        ));
        let health_monitor = Arc::new(HealthMonitor::new(3)); // Unhealthy after 3 failures
        let checkpoint_manager = Arc::new(CheckpointManager::new());
        
        let manager = Arc::new(Self {
            agents: Arc::new(RwLock::new(HashMap::new())),
            tasks: Arc::new(RwLock::new(HashMap::new())),
            executor,
            security_config,
            metrics: Arc::new(MetricsCollector::new()),
            task_queue,
            backpressure,
            circuit_breaker,
            health_monitor,
            checkpoint_manager,
        });
        
        // Start queue processor
        let manager_for_processor = Arc::clone(&manager);
        tokio::spawn(Self::queue_processor(manager_for_processor));
        
        // Start health recovery monitor
        let manager_for_health = Arc::clone(&manager);
        tokio::spawn(Self::health_recovery_monitor(manager_for_health));
        
        manager
    }
    
    pub fn with_security_config(
        router: Arc<ModelRouter>,
        config: Arc<Config>,
        security_config: AgentSecurityConfig,
    ) -> Arc<Self> {
        let executor = Arc::new(AgentExecutor::new(router, config));
        
        // Initialize fault tolerance systems
        let task_queue = Arc::new(TaskQueue::new(2000));
        let backpressure = Arc::new(BackpressureManager::new(200));
        let circuit_breaker = Arc::new(CircuitBreaker::new(5, std::time::Duration::from_secs(60)));
        let health_monitor = Arc::new(HealthMonitor::new(3));
        let checkpoint_manager = Arc::new(CheckpointManager::new());
        
        let manager = Arc::new(Self {
            agents: Arc::new(RwLock::new(HashMap::new())),
            tasks: Arc::new(RwLock::new(HashMap::new())),
            executor,
            security_config,
            metrics: Arc::new(MetricsCollector::new()),
            task_queue,
            backpressure,
            circuit_breaker,
            health_monitor,
            checkpoint_manager,
        });
        
        // Start queue processor
        let manager_for_processor = Arc::clone(&manager);
        tokio::spawn(Self::queue_processor(manager_for_processor));
        
        // Start health recovery monitor
        let manager_for_health = Arc::clone(&manager);
        tokio::spawn(Self::health_recovery_monitor(manager_for_health));
        
        manager
    }
    
    /// Queue processor - continuously processes queued tasks
    async fn queue_processor(manager: Arc<AgentManager>) {
        loop {
            // Check backpressure
            if !manager.backpressure.can_accept().await {
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                continue;
            }
            
            // Check circuit breaker
            if manager.circuit_breaker.is_open().await {
                // Try to recover
                manager.circuit_breaker.try_half_open().await;
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                continue;
            }
            
            // Dequeue task
            if let Some(task) = manager.task_queue.dequeue().await {
                // Reserve slot
                if let Err(e) = manager.backpressure.reserve().await {
                    tracing::warn!("Failed to reserve slot: {}", e);
                    // Re-queue task with higher priority
                    if let Err(e) = manager.task_queue.enqueue(task).await {
                        tracing::error!("Failed to re-queue task: {}", e);
                    }
                    continue;
                }
                
                let task_id = task.id.clone();
                let manager_clone = Arc::clone(&manager);
                
                tokio::spawn(async move {
                    // Find or create appropriate agent
                    let agent = match manager_clone.find_or_create_agent_for_task(&task).await {
                        Ok(agent) => agent,
                        Err(e) => {
                            tracing::error!("Failed to get agent for task {}: {}", task_id, e);
                            manager_clone.backpressure.release().await;
                            return;
                        }
                    };
                    
                    // Execute with retry and fault tolerance
                    let retry_config = RetryConfig {
                        max_retries: 3,
                        initial_delay: std::time::Duration::from_millis(500),
                        max_delay: std::time::Duration::from_secs(30),
                        backoff_multiplier: 2.0,
                    };
                    
                    let executor_clone = Arc::clone(&manager_clone.executor);
                    let agent_clone = agent.clone();
                    let task_clone = task.clone();
                    
                    let execution_result = executor_clone.execute_task(agent_clone.clone(), task_clone.clone()).await;
                    let success = execution_result.success;
                    
                    // Update task status in manager
                    {
                        let mut tasks = manager_clone.tasks.write().await;
                        if let Some(task) = tasks.get_mut(&task_id) {
                            task.status = if success {
                                TaskStatus::Completed
                            } else {
                                TaskStatus::Failed
                            };
                            task.result = execution_result.result.clone();
                            task.error = execution_result.error.clone();
                            task.completed_at = Some(chrono::Utc::now());
                        }
                    }
                    
                    // Update agent status
                    {
                        let mut agents = manager_clone.agents.write().await;
                        if let Some(agent) = agents.get_mut(&agent.id) {
                            agent.status = if success {
                                AgentStatus::Idle
                            } else {
                                AgentStatus::Failed
                            };
                            agent.current_task = None;
                        }
                    }
                    
                    // Record health and metrics
                    manager_clone.health_monitor.record_execution(&agent.id, success).await;
                    
                    if success {
                        manager_clone.circuit_breaker.record_success().await;
                        manager_clone.metrics.record_task_completed(
                            &task_id,
                            true,
                            execution_result.execution_time_ms,
                            execution_result.tokens_used,
                        ).await;
                    } else {
                        manager_clone.circuit_breaker.record_failure().await;
                        manager_clone.metrics.record_task_completed(
                            &task_id,
                            false,
                            execution_result.execution_time_ms,
                            execution_result.tokens_used,
                        ).await;
                    }
                    
                    // Release backpressure slot
                    manager_clone.backpressure.release().await;
                });
            } else {
                // Queue empty, wait a bit
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
        }
    }
    
    /// Find or create agent for task
    async fn find_or_create_agent_for_task(
        &self,
        task: &AgentTask,
    ) -> Result<Agent, String> {
        // Try to find idle agent that can handle this task
        let agents = self.agents.read().await;
        let mut candidate_agents: Vec<Agent> = agents.values()
            .filter(|agent| {
                agent.status == AgentStatus::Idle &&
                agent.can_handle_task(&task.r#type)
            })
            .cloned()
            .collect();
        drop(agents);
        
        // Check health for each candidate
        for agent in &candidate_agents {
            if self.health_monitor.is_healthy(&agent.id).await {
                return Ok(agent.clone());
            }
        }
        
        // No healthy agent found, create new one
        let agent_type = match task.r#type {
            TaskType::CodeGeneration => AgentType::CodeGenerator,
            TaskType::CodeAnalysis => AgentType::CodeAnalyzer,
            TaskType::Refactoring => AgentType::Refactorer,
            TaskType::Debugging => AgentType::Debugger,
            TaskType::Documentation => AgentType::Documenter,
            TaskType::Testing => AgentType::Tester,
        };
        
        self.create_agent(agent_type, None).await
    }
    
    /// Get queue status
    pub async fn get_queue_status(&self) -> serde_json::Value {
        serde_json::json!({
            "queue_size": self.task_queue.size().await,
            "queue_capacity": self.task_queue.capacity(),
            "concurrent_tasks": self.backpressure.current_count().await,
            "max_concurrent": self.backpressure.max_concurrent_tasks,
            "circuit_breaker_open": self.circuit_breaker.is_open().await,
        })
    }
    
    /// Get health status
    pub async fn get_health_status(&self) -> serde_json::Value {
        let unhealthy = self.health_monitor.get_unhealthy_agents().await;
        serde_json::json!({
            "unhealthy_agents": unhealthy.len(),
            "unhealthy_agent_ids": unhealthy,
        })
    }
    
    /// Get metrics collector
    pub fn metrics(&self) -> Arc<MetricsCollector> {
        Arc::clone(&self.metrics)
    }

    /// Create a new agent of specified type
    pub async fn create_agent(
        &self,
        agent_type: AgentType,
        name: Option<String>,
    ) -> Result<Agent, String> {
        // Check agent count limit
        let agents = self.agents.read().await;
        validate_agent_count(agents.len(), &self.security_config)
            .map_err(|e| e.to_string())?;
        drop(agents);
        
        let id = Uuid::new_v4().to_string();
        let agent_name = name.unwrap_or_else(|| format!("{:?}", agent_type));
        
        // Sanitize agent name
        let agent_name = sanitize_task_description(&agent_name);
        
        let agent = Agent::new(id.clone(), agent_name, agent_type);
        
        // Record metrics
        self.metrics.record_agent_created().await;
        
        let mut agents = self.agents.write().await;
        agents.insert(id.clone(), agent.clone());
        
        Ok(agent)
    }

    /// Get agent by ID
    pub async fn get_agent(&self, id: &str) -> Option<Agent> {
        let agents = self.agents.read().await;
        agents.get(id).cloned()
    }

    /// List all agents
    pub async fn list_agents(&self) -> Vec<Agent> {
        let agents = self.agents.read().await;
        agents.values().cloned().collect()
    }

    /// Create and assign a task to appropriate agents
    pub async fn create_task(&self, mut task: AgentTask) -> Result<AgentTask, String> {
        // Security validation
        validate_task_description(&task.description, &self.security_config)
            .map_err(|e| e.to_string())?;
        
        validate_context(&task.context, &self.security_config)
            .map_err(|e| e.to_string())?;
        
        // Check task count limit (now 1000)
        let tasks = self.tasks.read().await;
        validate_task_count(tasks.len(), &self.security_config)
            .map_err(|e| e.to_string())?;
        drop(tasks);
        
        // Check queue capacity
        if self.task_queue.is_full().await {
            return Err("Task queue is full. Please try again later.".to_string());
        }
        
        // Sanitize task description
        task.description = sanitize_task_description(&task.description);
        
        // Generate task ID if not present
        if task.id.is_empty() {
            task.id = Uuid::new_v4().to_string();
        }
        
        task.status = TaskStatus::Pending;
        task.created_at = chrono::Utc::now();

        // Record metrics
        self.metrics.record_task_started(&task.id).await;

        // Store task
        let task_id = task.id.clone();
        {
            let mut tasks = self.tasks.write().await;
            tasks.insert(task_id.clone(), task.clone());
        }

        // Decompose task if complex
        let decomposed = TaskDecomposer::decompose(task.clone());
        
        // Enqueue subtasks instead of immediate execution
        for subtask in decomposed.subtasks {
            let agent_task = AgentTask {
                id: subtask.id.clone(),
                r#type: subtask.task_type,
                description: subtask.description,
                context: subtask.context,
                priority: subtask.priority,
                status: TaskStatus::Pending,
                result: None,
                error: None,
                created_at: chrono::Utc::now(),
                completed_at: None,
            };
            
            // Store subtask
            {
                let mut tasks = self.tasks.write().await;
                tasks.insert(subtask.id.clone(), agent_task.clone());
            }
            
            // Enqueue for processing
            if let Err(e) = self.task_queue.enqueue(agent_task).await {
                tracing::error!("Failed to enqueue subtask {}: {}", subtask.id, e);
                // Continue with other subtasks
            }
        }

        Ok(task)
    }

    /// Assign subtasks to agents
    async fn assign_subtasks(&self, decomposed: super::types::DecomposedTask) -> Result<(), String> {
        let agents = self.agents.read().await;
        
        for subtask in decomposed.subtasks {
            // Find available agent of the right type
            let available_agent = agents.values()
                .find(|agent| {
                    agent.status == AgentStatus::Idle &&
                    agent.agent_type == subtask.assigned_agent_type.clone().unwrap_or(AgentType::CodeGenerator) &&
                    agent.can_handle_task(&subtask.task_type)
                });

            if let Some(agent) = available_agent {
                // Create agent task from subtask
                let agent_task = AgentTask {
                    id: subtask.id.clone(),
                    r#type: subtask.task_type,
                    description: subtask.description,
                    context: subtask.context,
                    priority: subtask.priority,
                    status: TaskStatus::Pending,
                    result: None,
                    error: None,
                    created_at: chrono::Utc::now(),
                    completed_at: None,
                };

                // Store subtask
                {
                    let mut tasks = self.tasks.write().await;
                    tasks.insert(subtask.id.clone(), agent_task);
                }

                // Execute agent task with timeout
                let executor = self.executor.clone();
                let agent_clone = agent.clone();
                let agent_task_clone = agent_task.clone();
                let timeout_duration = super::timeout::get_timeout_for_task(&agent_task_clone.r#type);
                let metrics = Arc::clone(&self.metrics);
                let task_id = agent_task_clone.id.clone();
                
                tokio::spawn(async move {
                    match super::timeout::execute_with_timeout(
                        &executor,
                        agent_clone,
                        agent_task_clone,
                        timeout_duration,
                    ).await {
                        Ok(result) => {
                            // Record metrics
                            metrics.record_task_completed(
                                &task_id,
                                result.success,
                                result.execution_time_ms,
                                result.tokens_used,
                            ).await;
                            tracing::info!("Agent task completed: {:?}", result.success);
                        }
                        Err(e) => {
                            // Record failed task
                            metrics.record_task_completed(
                                &task_id,
                                false,
                                0,
                                None,
                            ).await;
                            tracing::error!("Agent task failed: {}", e);
                        }
                    }
                });
            } else {
                // No available agent - create one
                let agent_type = subtask.assigned_agent_type
                    .unwrap_or(AgentType::CodeGenerator);
                
                let agent = match self.create_agent(agent_type, None).await {
                    Ok(agent) => agent,
                    Err(e) => {
                        tracing::error!("Failed to create agent: {}", e);
                        continue; // Skip this subtask if agent creation fails
                    }
                };
                
                // Retry assignment
                let agent_task = AgentTask {
                    id: subtask.id.clone(),
                    r#type: subtask.task_type,
                    description: subtask.description,
                    context: subtask.context,
                    priority: subtask.priority,
                    status: TaskStatus::Pending,
                    result: None,
                    error: None,
                    created_at: chrono::Utc::now(),
                    completed_at: None,
                };

                {
                    let mut tasks = self.tasks.write().await;
                    tasks.insert(subtask.id.clone(), agent_task);
                }

                let executor = self.executor.clone();
                let agent_clone = agent.clone();
                let agent_task_clone = agent_task.clone();
                let timeout_duration = super::timeout::get_timeout_for_task(&agent_task_clone.r#type);
                let metrics = Arc::clone(&self.metrics);
                let task_id = agent_task_clone.id.clone();
                
                tokio::spawn(async move {
                    match super::timeout::execute_with_timeout(
                        &executor,
                        agent_clone,
                        agent_task_clone,
                        timeout_duration,
                    ).await {
                        Ok(result) => {
                            // Record metrics
                            metrics.record_task_completed(
                                &task_id,
                                result.success,
                                result.execution_time_ms,
                                result.tokens_used,
                            ).await;
                            tracing::info!("Agent task completed: {:?}", result.success);
                        }
                        Err(e) => {
                            // Record failed task
                            metrics.record_task_completed(
                                &task_id,
                                false,
                                0,
                                None,
                            ).await;
                            tracing::error!("Agent task failed: {}", e);
                        }
                    }
                });
            }
        }

        Ok(())
    }

    /// Get task status
    pub async fn get_task_status(&self, task_id: &str) -> Option<AgentTask> {
        let tasks = self.tasks.read().await;
        tasks.get(task_id).cloned()
    }

    /// List all tasks
    pub async fn list_tasks(&self) -> Vec<AgentTask> {
        let tasks = self.tasks.read().await;
        tasks.values().cloned().collect()
    }

    /// Send message between agents
    pub async fn send_message(&self, message: AgentMessage) -> Result<(), String> {
        // For now, just log the message
        // In future, implement message routing
        tracing::info!("Agent message: {:?} -> {:?}: {:?}", 
            message.from, 
            message.to, 
            message.message_type
        );
        Ok(())
    }

    /// Get agents by type
    pub async fn get_agents_by_type(&self, agent_type: AgentType) -> Vec<Agent> {
        let agents = self.agents.read().await;
        agents.values()
            .filter(|agent| agent.agent_type == agent_type)
            .cloned()
            .collect()
    }

    /// Get idle agents
    pub async fn get_idle_agents(&self) -> Vec<Agent> {
        let agents = self.agents.read().await;
        agents.values()
            .filter(|agent| agent.status == AgentStatus::Idle)
            .cloned()
            .collect()
    }
}
