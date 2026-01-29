/**
 * Rate Limiting Middleware
 * 
 * Prevents abuse by limiting request rates per IP/user
 */
use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use std::net::IpAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use std::collections::HashMap;
use chrono::Utc;

/// Simple in-memory rate limiter
struct RateLimiter {
    requests: HashMap<String, Vec<chrono::DateTime<Utc>>>,
    max_requests: usize,
    window_seconds: i64,
}

impl RateLimiter {
    fn new(max_requests: usize, window_seconds: i64) -> Self {
        Self {
            requests: HashMap::new(),
            max_requests,
            window_seconds,
        }
    }
    
    fn check(&mut self, key: &str) -> bool {
        let now = Utc::now();
        let window_start = now - chrono::Duration::seconds(self.window_seconds);
        
        let requests = self.requests.entry(key.to_string()).or_insert_with(Vec::new);
        
        // Remove old requests outside the window
        requests.retain(|&time| time > window_start);
        
        // Check if under limit
        if requests.len() >= self.max_requests {
            false
        } else {
            requests.push(now);
            true
        }
    }
}

/// Create rate limiter instances
pub fn create_agent_rate_limiter() -> Arc<RwLock<RateLimiter>> {
    Arc::new(RwLock::new(RateLimiter::new(30, 60))) // 30 requests per minute
}

pub fn create_task_rate_limiter() -> Arc<RwLock<RateLimiter>> {
    Arc::new(RwLock::new(RateLimiter::new(10, 60))) // 10 requests per minute
}

/// Rate limit middleware for agent endpoints
pub async fn agent_rate_limit_middleware(
    limiter: Arc<RwLock<RateLimiter>>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Extract IP address
    let ip = request
        .extensions()
        .get::<IpAddr>()
        .copied()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|| "127.0.0.1".to_string());
    
    // Check rate limit
    let mut rate_limiter = limiter.write().await;
    if !rate_limiter.check(&ip) {
        tracing::warn!("Rate limit exceeded for IP: {}", ip);
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }
    drop(rate_limiter);
    
    Ok(next.run(request).await)
}

/// Rate limit middleware for task creation endpoints
pub async fn task_rate_limit_middleware(
    limiter: Arc<RwLock<RateLimiter>>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Extract IP address
    let ip = request
        .extensions()
        .get::<IpAddr>()
        .copied()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|| "127.0.0.1".to_string());
    
    // Check rate limit
    let mut rate_limiter = limiter.write().await;
    if !rate_limiter.check(&ip) {
        tracing::warn!("Task creation rate limit exceeded for IP: {}", ip);
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }
    drop(rate_limiter);
    
    Ok(next.run(request).await)
}
