/**
 * Authentication Middleware
 * 
 * Basic authentication for agent endpoints
 * (Full JWT auth can be added later)
 */
use axum::{
    extract::Request,
    http::{StatusCode, HeaderMap},
    middleware::Next,
    response::Response,
};
use tracing::warn;

/// API Key authentication (simple for now, can upgrade to JWT later)
pub async fn api_key_auth_middleware(
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // For now, allow all requests (development mode)
    // In production, check for API key in headers
    
    // Check for API key header
    let headers = request.headers();
    if let Some(api_key) = headers.get("X-API-Key") {
        // Validate API key (placeholder - implement proper validation)
        if api_key.to_str().unwrap_or("").is_empty() {
            warn!("Empty API key provided");
            return Err(StatusCode::UNAUTHORIZED);
        }
        // TODO: Validate against database or config
    } else {
        // For development, allow requests without API key
        // In production, uncomment this:
        // warn!("Missing API key header");
        // return Err(StatusCode::UNAUTHORIZED);
    }
    
    Ok(next.run(request).await)
}

/// Optional: Check if request has valid authentication
pub fn is_authenticated(headers: &HeaderMap) -> bool {
    headers.contains_key("X-API-Key")
}
