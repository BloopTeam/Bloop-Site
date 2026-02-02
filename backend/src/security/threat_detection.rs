/**
 * Threat Detection System
 * 
 * Advanced threat detection:
 * - Anomaly detection
 * - Behavioral analysis
 * - Attack pattern recognition
 * - Automated response
 */
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::Utc;

pub struct ThreatDetector {
    behavior_profiles: Arc<RwLock<HashMap<String, BehaviorProfile>>>,
    threat_history: Arc<RwLock<Vec<ThreatEvent>>>,
}

#[derive(Debug, Clone)]
struct BehaviorProfile {
    ip_address: String,
    request_patterns: Vec<RequestPattern>,
    normal_behavior: NormalBehavior,
    anomaly_score: f64,
}

#[derive(Debug, Clone)]
struct RequestPattern {
    endpoint: String,
    frequency: u32,
    time_of_day: Vec<u8>,
}

#[derive(Debug, Clone)]
struct NormalBehavior {
    avg_requests_per_minute: f64,
    common_endpoints: Vec<String>,
    typical_time_range: (u8, u8),
}

#[derive(Debug, Clone)]
pub struct ThreatEvent {
    pub id: String,
    pub timestamp: chrono::DateTime<Utc>,
    pub threat_type: ThreatType,
    pub severity: ThreatSeverity,
    pub source: String,
    pub description: String,
    pub action_taken: String,
}

#[derive(Debug, Clone)]
pub enum ThreatType {
    BruteForce,
    DDoS,
    UnusualBehavior,
    SuspiciousPattern,
    MaliciousRequest,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub enum ThreatSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl ThreatDetector {
    pub fn new() -> Self {
        Self {
            behavior_profiles: Arc::new(RwLock::new(HashMap::new())),
            threat_history: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Analyze request for threats
    pub async fn analyze_request(&self, ip: &str, endpoint: &str, timestamp: chrono::DateTime<Utc>) -> ThreatAnalysis {
        let mut profiles = self.behavior_profiles.write().await;
        
        let profile = profiles.entry(ip.to_string())
            .or_insert_with(|| BehaviorProfile {
                ip_address: ip.to_string(),
                request_patterns: Vec::new(),
                normal_behavior: NormalBehavior {
                    avg_requests_per_minute: 0.0,
                    common_endpoints: Vec::new(),
                    typical_time_range: (0, 23),
                },
                anomaly_score: 0.0,
            });

        // Analyze for threats
        let mut threats = Vec::new();
        let mut anomaly_score = 0.0;

        // Check for brute force (many failed auth attempts)
        // Check for DDoS (too many requests)
        // Check for unusual behavior patterns

        if anomaly_score > 0.7 {
            let threat_event = ThreatEvent {
                id: uuid::Uuid::new_v4().to_string(),
                timestamp,
                threat_type: ThreatType::UnusualBehavior,
                severity: ThreatSeverity::High,
                source: ip.to_string(),
                description: format!("Anomalous behavior detected: {}", endpoint),
                action_taken: "Rate limiting applied".to_string(),
            };

            let mut history = self.threat_history.write().await;
            history.push(threat_event.clone());
            if history.len() > 1000 {
                history.remove(0);
            }

            threats.push(threat_event);
        }

        ThreatAnalysis {
            is_threat: !threats.is_empty(),
            threat_level: if anomaly_score > 0.8 { ThreatSeverity::Critical } 
                         else if anomaly_score > 0.6 { ThreatSeverity::High }
                         else if anomaly_score > 0.4 { ThreatSeverity::Medium }
                         else { ThreatSeverity::Low },
            threats,
            recommended_action: if !threats.is_empty() { 
                Some("Block IP temporarily".to_string()) 
            } else { 
                None 
            },
        }
    }

    /// Get threat history
    pub async fn get_threat_history(&self, limit: usize) -> Vec<ThreatEvent> {
        let history = self.threat_history.read().await;
        history.iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }
}

#[derive(Debug, Clone)]
pub struct ThreatAnalysis {
    pub is_threat: bool,
    pub threat_level: ThreatSeverity,
    pub threats: Vec<ThreatEvent>,
    pub recommended_action: Option<String>,
}

impl Default for ThreatDetector {
    fn default() -> Self {
        Self::new()
    }
}
