/**
 * Request Logging Middleware
 * 
 * Logs all requests for monitoring and security auditing
 */
use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
};
use std::time::Instant;
use tracing::{info, warn};

/// Logging middleware for agent endpoints
pub async fn agent_logging_middleware(
    request: Request,
    next: Next,
) -> Response {
    let start = Instant::now();
    let method = request.method().clone();
    let uri = request.uri().clone();
    
    // Extract IP if available
    let ip = request
        .extensions()
        .get::<std::net::IpAddr>()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|| "unknown".to_string());
    
    info!(
        "Agent API request: {} {} from IP: {}",
        method, uri, ip
    );
    
    let response = next.run(request).await;
    let duration = start.elapsed();
    
    if response.status().is_server_error() {
        warn!(
            "Agent API error: {} {} - Status: {} - Duration: {:?}",
            method, uri, response.status(), duration
        );
    } else {
        info!(
            "Agent API response: {} {} - Status: {} - Duration: {:?}",
            method, uri, response.status(), duration
        );
    }
    
    response
}
