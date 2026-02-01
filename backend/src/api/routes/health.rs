/**
 * Health check endpoints
 * Provides system health status, database connectivity, and service status
 */
use axum::{
    extract::Extension,
    http::StatusCode,
    response::Json,
};
use serde::Serialize;
use std::sync::Arc;
use crate::config::Config;
use crate::database::Database;

#[derive(Debug, Serialize)]
pub struct HealthStatus {
    pub status: String,
    pub version: String,
    pub database: DatabaseStatus,
    pub services: ServicesStatus,
    pub timestamp: String,
}

#[derive(Debug, Serialize)]
pub struct DatabaseStatus {
    pub connected: bool,
    pub latency_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct ServicesStatus {
    pub openclaw: bool,
    pub moltbook: bool,
}

/// Comprehensive health check endpoint
pub async fn health_check(
    Extension(config): Extension<Config>,
    Extension(database): Extension<Option<Arc<Database>>>,
) -> Json<HealthStatus> {
    use chrono::Utc;
    use std::time::Instant;

    let mut db_status = DatabaseStatus {
        connected: false,
        latency_ms: None,
    };

    // Check database connectivity
    if let Some(ref db) = database {
        let start = Instant::now();
        match db.health_check().await {
            Ok(_) => {
                db_status.connected = true;
                db_status.latency_ms = Some(start.elapsed().as_millis() as u64);
            }
            Err(_) => {
                db_status.connected = false;
            }
        }
    }

    // Check service status
    let openclaw_enabled = std::env::var("OPENCLAW_ENABLED")
        .map(|v| v == "true")
        .unwrap_or(false);
    
    let moltbook_enabled = std::env::var("MOLTBOOK_ENABLED")
        .map(|v| v == "true")
        .unwrap_or(false);

    let overall_status = if db_status.connected || database.is_none() {
        "healthy"
    } else {
        "degraded"
    };

    Json(HealthStatus {
        status: overall_status.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        database: db_status,
        services: ServicesStatus {
            openclaw: openclaw_enabled,
            moltbook: moltbook_enabled,
        },
        timestamp: Utc::now().to_rfc3339(),
    })
}

/// Simple readiness probe
pub async fn readiness() -> Result<&'static str, StatusCode> {
    Ok("ready")
}

/// Simple liveness probe
pub async fn liveness() -> Result<&'static str, StatusCode> {
    Ok("alive")
}
