/**
 * Request ID Middleware
 * Adds unique request IDs to all requests for tracing
 */
use axum::{
    extract::Request,
    http::HeaderValue,
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

const REQUEST_ID_HEADER: &str = "x-request-id";

/// Generate and attach request ID to request
pub async fn request_id_middleware(
    mut request: Request,
    next: Next,
) -> Response {
    // Check if request ID already exists
    let request_id = if let Some(existing_id) = request.headers().get(REQUEST_ID_HEADER) {
        existing_id.to_str().unwrap_or("").to_string()
    } else {
        // Generate new request ID
        Uuid::new_v4().to_string()
    };

    // Add request ID to request extensions for use in handlers
    request.extensions_mut().insert(request_id.clone());

    // Add request ID to response headers
    let mut response = next.run(request).await;
    if let Ok(header_value) = HeaderValue::from_str(&request_id) {
        response.headers_mut().insert(REQUEST_ID_HEADER, header_value);
    }

    response
}

/// Extract request ID from request extensions
pub fn get_request_id(request: &axum::extract::Request) -> Option<String> {
    request.extensions().get::<String>().cloned()
}
