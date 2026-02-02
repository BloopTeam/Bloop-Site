/**
 * Demand Analyzer
 * 
 * Analyzes user demand and routes tasks to appropriate agents
 */
use std::sync::Arc;
use std::collections::HashMap;
use crate::services::agent::AgentManager;
use crate::types::{AgentTask, TaskType, Priority};
use super::types::{DemandAnalysis, ResourceRequirements, CompanyRole};

pub struct DemandAnalyzer {
    agent_manager: Arc<AgentManager>,
}

impl DemandAnalyzer {
    pub fn new(agent_manager: Arc<AgentManager>) -> Self {
        Self { agent_manager }
    }

    /// Analyze current demand from pending tasks
    pub async fn analyze_demand(&self) -> anyhow::Result<DemandAnalysis> {
        // Get all pending tasks from agent manager
        let tasks = self.agent_manager.list_tasks().await;
        
        let mut demand_by_type = HashMap::new();
        let mut demand_by_role = HashMap::new();
        let mut urgent_count = 0;
        let mut high_count = 0;
        let mut medium_count = 0;
        let mut low_count = 0;

        for task in &tasks {
            // Count by priority
            match task.priority {
                Priority::Urgent => urgent_count += 1,
                Priority::High => high_count += 1,
                Priority::Medium => medium_count += 1,
                Priority::Low => low_count += 1,
            }

            // Count by task type
            *demand_by_type.entry(task.r#type.clone()).or_insert(0) += 1;

            // Map task type to company role
            let role = self.task_type_to_role(&task.r#type);
            *demand_by_role.entry(role).or_insert(0) += 1;
        }

        let total_demand = tasks.len() as u32;

        // Calculate resource requirements
        let resource_requirements = self.calculate_resource_requirements(
            &demand_by_role,
            &demand_by_type,
        );

        // Estimate completion time
        let estimated_completion_time = self.estimate_completion_time(
            &tasks,
            &resource_requirements,
        );

        Ok(DemandAnalysis {
            total_demand,
            urgent_tasks: urgent_count,
            high_priority_tasks: high_count,
            medium_priority_tasks: medium_count,
            low_priority_tasks: low_count,
            demand_by_type,
            demand_by_role,
            estimated_completion_time,
            resource_requirements,
        })
    }

    /// Calculate resource requirements based on demand
    fn calculate_resource_requirements(
        &self,
        demand_by_role: &HashMap<CompanyRole, u32>,
        demand_by_type: &HashMap<TaskType, u32>,
    ) -> ResourceRequirements {
        let mut agents_needed = HashMap::new();

        // Calculate agents needed per role
        for (role, count) in demand_by_role {
            // Assume each agent can handle ~5 tasks concurrently
            let needed = (*count as f64 / 5.0).ceil() as usize;
            agents_needed.insert(role.clone(), needed.max(1));
        }

        // Estimate tokens (rough calculation)
        let estimated_tokens = demand_by_type.values().sum::<u32>() as u64 * 1000;

        // Estimate time (rough calculation: 30 seconds per task)
        let estimated_time_ms = demand_by_type.values().sum::<u32>() as u64 * 30000;

        // Check if visual assets are needed
        let visual_assets_needed = demand_by_type.contains_key(&TaskType::CodeGeneration)
            || demand_by_type.contains_key(&TaskType::Documentation);

        // Check if collaboration is needed (multiple roles involved)
        let collaboration_needed = demand_by_role.len() > 1;

        ResourceRequirements {
            agents_needed,
            estimated_tokens,
            estimated_time_ms,
            visual_assets_needed,
            collaboration_needed,
        }
    }

    /// Estimate completion time for all tasks
    fn estimate_completion_time(
        &self,
        tasks: &[AgentTask],
        requirements: &ResourceRequirements,
    ) -> Option<u64> {
        if tasks.is_empty() {
            return None;
        }

        // Use resource requirements estimate
        Some(requirements.estimated_time_ms)
    }

    /// Map task type to company role
    fn task_type_to_role(&self, task_type: &TaskType) -> CompanyRole {
        match task_type {
            TaskType::CodeGeneration => CompanyRole::BackendEngineer,
            TaskType::CodeAnalysis => CompanyRole::BackendEngineer,
            TaskType::Refactoring => CompanyRole::BackendEngineer,
            TaskType::Debugging => CompanyRole::QaEngineer,
            TaskType::Documentation => CompanyRole::DocumentationSpecialist,
            TaskType::Testing => CompanyRole::QaEngineer,
        }
    }
}
