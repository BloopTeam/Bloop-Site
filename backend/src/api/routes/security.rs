/**
 * Security API Routes
 * 
 * Endpoints for security features:
 * - Security events
 * - Vulnerability scanning
 * - Threat detection
 * - Audit logs
 */
use axum::{
    extract::{Extension, Path, Query},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::security::{AuditLogger, VulnerabilityScanner, ThreatDetector, AuditLog, Vulnerability};
use crate::config::Config;

#[derive(Debug, Serialize)]
pub struct SecurityEventsResponse {
    pub events: Vec<AuditLog>,
    pub total: usize,
}

#[derive(Debug, Serialize)]
pub struct VulnerabilitiesResponse {
    pub vulnerabilities: Vec<Vulnerability>,
    pub total: usize,
}

#[derive(Debug, Deserialize)]
pub struct ScanCodeRequest {
    pub code: String,
    pub language: String,
}

/// Get security events
pub async fn get_security_events(
    Extension(audit_logger): Extension<Arc<AuditLogger>>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<SecurityEventsResponse>, StatusCode> {
    let limit = params.get("limit")
        .and_then(|l| l.parse::<usize>().ok())
        .unwrap_or(100);

    let events = audit_logger.get_recent_logs(limit).await;

    Ok(Json(SecurityEventsResponse {
        total: events.len(),
        events,
    }))
}

/// Get vulnerabilities
pub async fn get_vulnerabilities(
    Extension(scanner): Extension<Arc<VulnerabilityScanner>>,
) -> Result<Json<VulnerabilitiesResponse>, StatusCode> {
    // In production, this would scan the codebase
    let vulnerabilities = vec![];

    Ok(Json(VulnerabilitiesResponse {
        total: vulnerabilities.len(),
        vulnerabilities,
    }))
}

/// Scan code for vulnerabilities
pub async fn scan_code(
    Extension(scanner): Extension<Arc<VulnerabilityScanner>>,
    Json(request): Json<ScanCodeRequest>,
) -> Result<Json<VulnerabilitiesResponse>, StatusCode> {
    let vulnerabilities = scanner.scan_code(&request.code, &request.language);

    Ok(Json(VulnerabilitiesResponse {
        total: vulnerabilities.len(),
        vulnerabilities,
    }))
}
