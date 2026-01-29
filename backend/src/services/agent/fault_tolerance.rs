/**
 * Fault Tolerance System
 * 
 * Ensures zero casualties and faults with:
 * - Retry logic with exponential backoff
 * - Circuit breakers
 * - Health checks
 * - Automatic recovery
 * - Checkpointing
 */
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::Duration;
use std::collections::HashMap;
use chrono::Utc;
use serde::{Serialize, Deserialize};

/// Circuit breaker state
#[derive(Debug, Clone, PartialEq)]
pub enum CircuitState {
    Closed,   // Normal operation
    Open,     // Failing, reject requests
    HalfOpen, // Testing if recovered
}

/// Circuit breaker for agent operations
pub struct CircuitBreaker {
    state: Arc<RwLock<CircuitState>>,
    failure_count: Arc<RwLock<u32>>,
    success_count: Arc<RwLock<u32>>,
    last_failure_time: Arc<RwLock<Option<chrono::DateTime<Utc>>>>,
    failure_threshold: u32,
    success_threshold: u32,
    timeout: Duration,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: u32, timeout: Duration) -> Self {
        Self {
            state: Arc::new(RwLock::new(CircuitState::Closed)),
            failure_count: Arc::new(RwLock::new(0)),
            success_count: Arc::new(RwLock::new(0)),
            last_failure_time: Arc::new(RwLock::new(None)),
            failure_threshold,
            success_threshold: 3, // Need 3 successes to close circuit
            timeout,
        }
    }
    
    /// Check if operation is allowed
    pub async fn is_open(&self) -> bool {
        let state = self.state.read().await;
        matches!(*state, CircuitState::Open)
    }
    
    /// Record success
    pub async fn record_success(&self) {
        let mut state = self.state.write().await;
        let mut success_count = self.success_count.write().await;
        let mut failure_count = self.failure_count.write().await;
        
        match *state {
            CircuitState::HalfOpen => {
                *success_count += 1;
                if *success_count >= self.success_threshold {
                    *state = CircuitState::Closed;
                    *failure_count = 0;
                    *success_count = 0;
                    tracing::info!("Circuit breaker closed - service recovered");
                }
            }
            CircuitState::Closed => {
                *failure_count = 0;
            }
            CircuitState::Open => {
                // Shouldn't happen, but handle it
            }
        }
    }
    
    /// Record failure
    pub async fn record_failure(&self) {
        let mut state = self.state.write().await;
        let mut failure_count = self.failure_count.write().await;
        let mut last_failure = self.last_failure_time.write().await;
        
        *failure_count += 1;
        *last_failure = Some(Utc::now());
        
        if *failure_count >= self.failure_threshold {
            *state = CircuitState::Open;
            tracing::warn!("Circuit breaker opened - too many failures");
        }
    }
    
    /// Try to transition to half-open
    pub async fn try_half_open(&self) -> bool {
        let mut state = self.state.write().await;
        let last_failure = self.last_failure_time.read().await;
        
        if let Some(last_fail) = *last_failure {
            let elapsed = Utc::now() - last_fail;
            if elapsed.num_seconds() >= self.timeout.as_secs() as i64 {
                *state = CircuitState::HalfOpen;
                let mut success_count = self.success_count.write().await;
                *success_count = 0;
                tracing::info!("Circuit breaker half-open - testing recovery");
                return true;
            }
        }
        
        false
    }
}

/// Retry configuration
#[derive(Debug, Clone)]
pub struct RetryConfig {
    pub max_retries: u32,
    pub initial_delay: Duration,
    pub max_delay: Duration,
    pub backoff_multiplier: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(30),
            backoff_multiplier: 2.0,
        }
    }
}

/// Execute with retry logic
pub async fn execute_with_retry<F, T, E>(
    operation: F,
    config: RetryConfig,
) -> Result<T, E>
where
    F: Fn() -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<T, E>> + Send>>,
    E: std::fmt::Display + Clone,
{
    let mut delay = config.initial_delay;
    let mut last_error = None;
    
    for attempt in 0..=config.max_retries {
        match operation().await {
            Ok(result) => {
                if attempt > 0 {
                    tracing::info!("Operation succeeded after {} retries", attempt);
                }
                return Ok(result);
            }
            Err(e) => {
                last_error = Some(e.clone());
                if attempt < config.max_retries {
                    tracing::warn!(
                        "Operation failed (attempt {}/{}): {}. Retrying in {:?}...",
                        attempt + 1,
                        config.max_retries + 1,
                        e,
                        delay
                    );
                    tokio::time::sleep(delay).await;
                    delay = Duration::from_millis(
                        (delay.as_millis() as f64 * config.backoff_multiplier) as u64
                    ).min(config.max_delay);
                } else {
                    tracing::error!("Operation failed after {} retries: {}", config.max_retries + 1, e);
                }
            }
        }
    }
    
    Err(last_error.expect("Should have error after retries"))
}

/// Agent health status
#[derive(Debug, Clone)]
pub struct AgentHealth {
    pub agent_id: String,
    pub is_healthy: bool,
    pub consecutive_failures: u32,
    pub last_success: Option<chrono::DateTime<Utc>>,
    pub last_failure: Option<chrono::DateTime<Utc>>,
    pub total_executions: u64,
    pub successful_executions: u64,
}

/// Health monitor for agents
pub struct HealthMonitor {
    agent_health: Arc<RwLock<HashMap<String, AgentHealth>>>,
    unhealthy_threshold: u32,
}

impl HealthMonitor {
    pub fn new(unhealthy_threshold: u32) -> Self {
        Self {
            agent_health: Arc::new(RwLock::new(HashMap::new())),
            unhealthy_threshold,
        }
    }
    
    /// Record agent execution result
    pub async fn record_execution(&self, agent_id: &str, success: bool) {
        let mut health_map = self.agent_health.write().await;
        let health = health_map.entry(agent_id.to_string()).or_insert_with(|| {
            AgentHealth {
                agent_id: agent_id.to_string(),
                is_healthy: true,
                consecutive_failures: 0,
                last_success: None,
                last_failure: None,
                total_executions: 0,
                successful_executions: 0,
            }
        });
        
        health.total_executions += 1;
        
        if success {
            health.consecutive_failures = 0;
            health.last_success = Some(Utc::now());
            health.successful_executions += 1;
            health.is_healthy = true;
        } else {
            health.consecutive_failures += 1;
            health.last_failure = Some(Utc::now());
            if health.consecutive_failures >= self.unhealthy_threshold {
                health.is_healthy = false;
                tracing::warn!("Agent {} marked as unhealthy ({} consecutive failures)", 
                    agent_id, health.consecutive_failures);
            }
        }
    }
    
    /// Check if agent is healthy
    pub async fn is_healthy(&self, agent_id: &str) -> bool {
        let health_map = self.agent_health.read().await;
        health_map.get(agent_id)
            .map(|h| h.is_healthy)
            .unwrap_or(true) // Assume healthy if not tracked
    }
    
    /// Get agent health
    pub async fn get_health(&self, agent_id: &str) -> Option<AgentHealth> {
        let health_map = self.agent_health.read().await;
        health_map.get(agent_id).cloned()
    }
    
    /// Get all unhealthy agents
    pub async fn get_unhealthy_agents(&self) -> Vec<String> {
        let health_map = self.agent_health.read().await;
        health_map.values()
            .filter(|h| !h.is_healthy)
            .map(|h| h.agent_id.clone())
            .collect()
    }
}

/// Task checkpoint for recovery
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TaskCheckpoint {
    pub task_id: String,
    pub agent_id: String,
    pub checkpoint_data: serde_json::Value,
    pub created_at: chrono::DateTime<Utc>,
}

/// Checkpoint manager for fault recovery
pub struct CheckpointManager {
    checkpoints: Arc<RwLock<HashMap<String, TaskCheckpoint>>>,
}

impl CheckpointManager {
    pub fn new() -> Self {
        Self {
            checkpoints: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    /// Save checkpoint
    pub async fn save_checkpoint(&self, checkpoint: TaskCheckpoint) {
        let mut checkpoints = self.checkpoints.write().await;
        checkpoints.insert(checkpoint.task_id.clone(), checkpoint);
        tracing::debug!("Checkpoint saved for task: {}", checkpoint.task_id);
    }
    
    /// Load checkpoint
    pub async fn load_checkpoint(&self, task_id: &str) -> Option<TaskCheckpoint> {
        let checkpoints = self.checkpoints.read().await;
        checkpoints.get(task_id).cloned()
    }
    
    /// Remove checkpoint
    pub async fn remove_checkpoint(&self, task_id: &str) {
        let mut checkpoints = self.checkpoints.write().await;
        checkpoints.remove(task_id);
    }
}

impl Default for CheckpointManager {
    fn default() -> Self {
        Self::new()
    }
}
