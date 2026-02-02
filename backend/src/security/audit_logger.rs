/**
 * Security Audit Logger
 * 
 * Comprehensive audit logging for security events:
 * - All authentication attempts
 * - All API access
 * - Security violations
 * - Configuration changes
 * - Threat detection events
 */
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::Utc;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: String,
    pub timestamp: chrono::DateTime<Utc>,
    pub event_type: AuditEventType,
    pub user_id: Option<String>,
    pub ip_address: Option<String>,
    pub resource: String,
    pub action: String,
    pub result: AuditResult,
    pub details: Option<serde_json::Value>,
    pub threat_level: ThreatLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditEventType {
    Authentication,
    Authorization,
    ApiAccess,
    SecurityViolation,
    ConfigurationChange,
    ThreatDetected,
    DataAccess,
    DataModification,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditResult {
    Success,
    Failure,
    Blocked,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, PartialOrd)]
pub enum ThreatLevel {
    Low,
    Medium,
    High,
    Critical,
}

pub struct AuditLogger {
    logs: Arc<RwLock<Vec<AuditLog>>>,
    max_logs: usize,
}

impl AuditLogger {
    pub fn new(max_logs: usize) -> Self {
        Self {
            logs: Arc::new(RwLock::new(Vec::new())),
            max_logs,
        }
    }

    /// Log a security event
    pub async fn log(&self, event: AuditLog) {
        let mut logs = self.logs.write().await;
        logs.push(event);
        
        // Keep only recent logs
        if logs.len() > self.max_logs {
            logs.remove(0);
        }
    }

    /// Log authentication attempt
    pub async fn log_auth(&self, user_id: Option<String>, ip: Option<String>, success: bool) {
        self.log(AuditLog {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            event_type: AuditEventType::Authentication,
            user_id,
            ip_address: ip,
            resource: "authentication".to_string(),
            action: "login".to_string(),
            result: if success { AuditResult::Success } else { AuditResult::Failure },
            details: None,
            threat_level: if success { ThreatLevel::Low } else { ThreatLevel::Medium },
        }).await;
    }

    /// Log security violation
    pub async fn log_violation(&self, violation_type: String, ip: Option<String>, details: Option<serde_json::Value>) {
        self.log(AuditLog {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            event_type: AuditEventType::SecurityViolation,
            user_id: None,
            ip_address: ip,
            resource: "security".to_string(),
            action: violation_type,
            result: AuditResult::Blocked,
            details,
            threat_level: ThreatLevel::High,
        }).await;
    }

    /// Get recent logs
    pub async fn get_recent_logs(&self, limit: usize) -> Vec<AuditLog> {
        let logs = self.logs.read().await;
        logs.iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Get logs by threat level
    pub async fn get_logs_by_threat(&self, threat_level: ThreatLevel) -> Vec<AuditLog> {
        let logs = self.logs.read().await;
        logs.iter()
            .filter(|log| log.threat_level >= threat_level)
            .cloned()
            .collect()
    }
}

impl Default for AuditLogger {
    fn default() -> Self {
        Self::new(10000)
    }
}
