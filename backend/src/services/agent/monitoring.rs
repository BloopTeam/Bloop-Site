/**
 * Agent Monitoring & Metrics
 * 
 * Tracks agent performance, resource usage, and system health
 */
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use chrono::Utc;

/// Agent metrics
#[derive(Debug, Clone)]
pub struct AgentMetrics {
    pub total_agents_created: u64,
    pub total_tasks_executed: u64,
    pub successful_tasks: u64,
    pub failed_tasks: u64,
    pub total_execution_time_ms: u64,
    pub total_tokens_used: u64,
    pub active_agents: usize,
    pub active_tasks: usize,
}

impl Default for AgentMetrics {
    fn default() -> Self {
        Self {
            total_agents_created: 0,
            total_tasks_executed: 0,
            successful_tasks: 0,
            failed_tasks: 0,
            total_execution_time_ms: 0,
            total_tokens_used: 0,
            active_agents: 0,
            active_tasks: 0,
        }
    }
}

/// Metrics collector
pub struct MetricsCollector {
    metrics: Arc<RwLock<AgentMetrics>>,
    agent_start_times: Arc<RwLock<HashMap<String, chrono::DateTime<Utc>>>>,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            metrics: Arc::new(RwLock::new(AgentMetrics::default())),
            agent_start_times: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    pub async fn record_agent_created(&self) {
        let mut metrics = self.metrics.write().await;
        metrics.total_agents_created += 1;
        metrics.active_agents += 1;
    }
    
    pub async fn record_task_started(&self, task_id: &str) {
        let mut metrics = self.metrics.write().await;
        metrics.total_tasks_executed += 1;
        metrics.active_tasks += 1;
        
        let mut start_times = self.agent_start_times.write().await;
        start_times.insert(task_id.to_string(), Utc::now());
    }
    
    pub async fn record_task_completed(
        &self,
        task_id: &str,
        success: bool,
        execution_time_ms: u64,
        tokens_used: Option<u32>,
    ) {
        let mut metrics = self.metrics.write().await;
        
        if success {
            metrics.successful_tasks += 1;
        } else {
            metrics.failed_tasks += 1;
        }
        
        metrics.total_execution_time_ms += execution_time_ms;
        if let Some(tokens) = tokens_used {
            metrics.total_tokens_used += tokens as u64;
        }
        
        if metrics.active_tasks > 0 {
            metrics.active_tasks -= 1;
        }
        
        let mut start_times = self.agent_start_times.write().await;
        start_times.remove(task_id);
    }
    
    pub async fn record_agent_idle(&self) {
        let mut metrics = self.metrics.write().await;
        if metrics.active_agents > 0 {
            metrics.active_agents -= 1;
        }
    }
    
    pub async fn get_metrics(&self) -> AgentMetrics {
        let metrics = self.metrics.read().await;
        metrics.clone()
    }
    
    pub async fn get_average_execution_time(&self) -> f64 {
        let metrics = self.metrics.read().await;
        if metrics.total_tasks_executed > 0 {
            metrics.total_execution_time_ms as f64 / metrics.total_tasks_executed as f64
        } else {
            0.0
        }
    }
    
    pub async fn get_success_rate(&self) -> f64 {
        let metrics = self.metrics.read().await;
        if metrics.total_tasks_executed > 0 {
            metrics.successful_tasks as f64 / metrics.total_tasks_executed as f64
        } else {
            0.0
        }
    }
}

impl Default for MetricsCollector {
    fn default() -> Self {
        Self::new()
    }
}
