/**
 * Company Health Monitor
 * 
 * Monitors health of the agent company and ensures 24/7/365 operation
 */
use std::sync::Arc;
use crate::services::company::orchestrator::CompanyOrchestrator;

pub struct CompanyHealthMonitor {
    last_health_check: Arc<tokio::sync::RwLock<chrono::DateTime<chrono::Utc>>>,
}

impl CompanyHealthMonitor {
    pub fn new() -> Self {
        Self {
            last_health_check: Arc::new(tokio::sync::RwLock::new(chrono::Utc::now())),
        }
    }

    /// Check company health
    pub async fn check_company_health(&self, orchestrator: &CompanyOrchestrator) {
        let members = orchestrator.get_members().await;
        let metrics = orchestrator.get_metrics().await;

        // Check if agents are healthy
        let active_count = members.iter().filter(|m| m.is_active).count();
        let inactive_count = members.len() - active_count;

        if inactive_count > 0 {
            tracing::warn!(
                "Company health check: {} inactive agents out of {} total",
                inactive_count,
                members.len()
            );
        }

        // Check success rate
        if metrics.success_rate < 0.8 {
            tracing::warn!(
                "Company health check: Low success rate: {:.2}%",
                metrics.success_rate * 100.0
            );
        }

        // Update last health check time
        *self.last_health_check.write().await = chrono::Utc::now();

        tracing::debug!(
            "Company health check: {} active agents, {:.2}% success rate",
            active_count,
            metrics.success_rate * 100.0
        );
    }

    /// Get last health check time
    pub async fn last_health_check(&self) -> chrono::DateTime<chrono::Utc> {
        *self.last_health_check.read().await
    }
}
