/**
 * Predictive Scaling System
 * 
 * Predicts demand and scales agent resources accordingly
 */
use std::sync::Arc;
use std::collections::HashMap;
use chrono::Utc;
use crate::services::agent::AgentManager;
use super::types::{DemandAnalysis, CompanyRole};

pub struct PredictiveScaler {
    agent_manager: Arc<AgentManager>,
    demand_history: Arc<tokio::sync::RwLock<Vec<(chrono::DateTime<chrono::Utc>, DemandAnalysis)>>>,
}

impl PredictiveScaler {
    pub fn new(agent_manager: Arc<AgentManager>) -> Self {
        Self {
            agent_manager,
            demand_history: Arc::new(tokio::sync::RwLock::new(Vec::new())),
        }
    }

    /// Record demand for predictive analysis
    pub async fn record_demand(&self, demand: DemandAnalysis) {
        let mut history = self.demand_history.write().await;
        history.push((Utc::now(), demand));
        
        // Keep only last 1000 records
        if history.len() > 1000 {
            history.remove(0);
        }
    }

    /// Predict future demand based on historical patterns
    pub async fn predict_demand(&self, hours_ahead: u32) -> DemandAnalysis {
        let history = self.demand_history.read().await;
        
        if history.is_empty() {
            // No history, return empty prediction
            return DemandAnalysis {
                total_demand: 0,
                urgent_tasks: 0,
                high_priority_tasks: 0,
                medium_priority_tasks: 0,
                low_priority_tasks: 0,
                demand_by_type: HashMap::new(),
                demand_by_role: HashMap::new(),
                estimated_completion_time: None,
                resource_requirements: super::types::ResourceRequirements {
                    agents_needed: HashMap::new(),
                    estimated_tokens: 0,
                    estimated_time_ms: 0,
                    visual_assets_needed: false,
                    collaboration_needed: false,
                },
            };
        }

        // Simple prediction: average of recent demand
        let recent_history: Vec<_> = history
            .iter()
            .rev()
            .take(24) // Last 24 data points (assuming 5min intervals = 2 hours)
            .collect();

        let avg_demand = if !recent_history.is_empty() {
            recent_history.len() as u32
        } else {
            0
        };

        // Scale prediction based on time of day patterns
        let hour = Utc::now().hour();
        let time_multiplier = if hour >= 9 && hour <= 17 {
            1.5 // Business hours - higher demand
        } else {
            0.8 // Off hours - lower demand
        };

        let predicted_demand = (avg_demand as f64 * time_multiplier * hours_ahead as f64) as u32;

        DemandAnalysis {
            total_demand: predicted_demand,
            urgent_tasks: (predicted_demand as f64 * 0.1) as u32,
            high_priority_tasks: (predicted_demand as f64 * 0.3) as u32,
            medium_priority_tasks: (predicted_demand as f64 * 0.4) as u32,
            low_priority_tasks: (predicted_demand as f64 * 0.2) as u32,
            demand_by_type: HashMap::new(),
            demand_by_role: HashMap::new(),
            estimated_completion_time: Some(predicted_demand as u64 * 30000), // 30s per task
            resource_requirements: super::types::ResourceRequirements {
                agents_needed: HashMap::new(),
                estimated_tokens: predicted_demand as u64 * 1000,
                estimated_time_ms: predicted_demand as u64 * 30000,
                visual_assets_needed: false,
                collaboration_needed: false,
            },
        }
    }

    /// Calculate optimal agent count for predicted demand
    pub async fn calculate_optimal_agents(&self, predicted_demand: &DemandAnalysis) -> HashMap<CompanyRole, usize> {
        let mut optimal_agents = HashMap::new();

        // Calculate agents needed based on predicted demand
        for (role, demand_count) in &predicted_demand.demand_by_role {
            // Assume each agent can handle ~5 tasks concurrently
            let needed = (*demand_count as f64 / 5.0).ceil() as usize;
            optimal_agents.insert(role.clone(), needed.max(1));
        }

        optimal_agents
    }

    /// Scale agents up or down based on prediction
    pub async fn scale_agents(&self, optimal_agents: &HashMap<CompanyRole, usize>) {
        // In production, this would:
        // 1. Compare current agent count with optimal
        // 2. Create new agents if needed
        // 3. Deactivate excess agents
        // 4. Balance load across agents

        tracing::debug!("Scaling agents based on prediction: {:?}", optimal_agents);
    }
}
