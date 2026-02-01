/**
 * Security Middleware
 * Input validation, sanitization, CSRF protection, and security headers
 */
use axum::{
    extract::Request,
    http::{HeaderMap, HeaderValue, StatusCode},
    middleware::Next,
    response::Response,
};
use std::sync::Arc;
use validator::{Validate, ValidationError};
use serde::{Deserialize, Serialize};

/// Maximum request body size (10MB)
const MAX_BODY_SIZE: usize = 10 * 1024 * 1024;

/// Maximum string length for various fields
const MAX_STRING_LENGTH: usize = 10000;
const MAX_SKILL_NAME_LENGTH: usize = 255;
const MAX_SESSION_ID_LENGTH: usize = 255;

/// Security headers middleware
pub async fn security_headers_middleware(
    request: Request,
    next: Next,
) -> Response {
    let mut response = next.run(request).await;
    
    let headers = response.headers_mut();
    
    // Security headers
    headers.insert(
        "X-Content-Type-Options",
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        "X-Frame-Options",
        HeaderValue::from_static("DENY"),
    );
    headers.insert(
        "X-XSS-Protection",
        HeaderValue::from_static("1; mode=block"),
    );
    headers.insert(
        "Strict-Transport-Security",
        HeaderValue::from_static("max-age=31536000; includeSubDomains"),
    );
    headers.insert(
        "Content-Security-Policy",
        HeaderValue::from_static("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"),
    );
    headers.insert(
        "Referrer-Policy",
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    
    response
}

/// Input validation for OpenClaw requests
#[derive(Debug, Deserialize, Validate)]
pub struct OpenClawMessageRequest {
    #[validate(length(max = "MAX_STRING_LENGTH"))]
    pub message: String,
    
    #[validate(length(max = "50"))]
    pub thinking_level: Option<String>,
    
    #[validate(length(max = "100"))]
    pub model: Option<String>,
    
    #[validate(length(max = "MAX_SESSION_ID_LENGTH"))]
    pub session_id: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct SkillExecutionRequest {
    #[validate(length(max = "MAX_SKILL_NAME_LENGTH"))]
    pub skill_name: String,
    
    pub params: Option<serde_json::Value>,
    
    pub context: Option<CodeContext>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct CodeContext {
    #[validate(length(max = "1000"))]
    pub file_path: Option<String>,
    
    #[validate(length(max = "MAX_STRING_LENGTH"))]
    pub code: Option<String>,
    
    #[validate(length(max = "50"))]
    pub language: Option<String>,
}

/// Input validation for Moltbook requests
#[derive(Debug, Deserialize, Validate)]
pub struct MoltbookPostRequest {
    #[validate(length(min = 1, max = "500"))]
    pub title: String,
    
    #[validate(length(min = 1, max = "MAX_STRING_LENGTH"))]
    pub content: String,
    
    #[validate(length(max = "100"))]
    pub submolt: String,
    
    #[validate(length(max = "50"))]
    pub content_type: Option<String>,
    
    #[validate(length(max = "50"))]
    pub language: Option<String>,
    
    #[validate(length(max = "20"))]
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct MoltbookSkillRequest {
    #[validate(length(min = 1, max = "MAX_SKILL_NAME_LENGTH"))]
    pub name: String,
    
    #[validate(length(min = 1, max = "MAX_STRING_LENGTH"))]
    pub description: String,
    
    #[validate(length(min = 1, max = "MAX_STRING_LENGTH"))]
    pub skill_md: String,
    
    #[validate(length(max = "50"))]
    pub version: String,
    
    #[validate(length(max = "20"))]
    pub tags: Option<Vec<String>>,
    
    #[validate(url)]
    pub repository: Option<String>,
}

/// Sanitize string input
pub fn sanitize_string(input: &str, max_length: usize) -> String {
    let mut sanitized = input
        .chars()
        .take(max_length)
        .filter(|c| !c.is_control() || *c == '\n' || *c == '\r' || *c == '\t')
        .collect::<String>();
    
    // Remove potential script tags
    sanitized = sanitized
        .replace("<script", "")
        .replace("</script>", "")
        .replace("javascript:", "")
        .replace("onerror=", "")
        .replace("onclick=", "");
    
    sanitized
}

/// Validate and sanitize skill name
pub fn validate_skill_name(name: &str) -> Result<String, ValidationError> {
    if name.is_empty() {
        return Err(ValidationError::new("skill_name_empty"));
    }
    
    if name.len() > MAX_SKILL_NAME_LENGTH {
        return Err(ValidationError::new("skill_name_too_long"));
    }
    
    // Only allow alphanumeric, hyphens, underscores
    if !name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
        return Err(ValidationError::new("skill_name_invalid_chars"));
    }
    
    Ok(sanitize_string(name, MAX_SKILL_NAME_LENGTH))
}

/// Validate JSON payload size
pub async fn validate_payload_size(
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Check Content-Length header
    if let Some(content_length) = request.headers().get("content-length") {
        if let Ok(length_str) = content_length.to_str() {
            if let Ok(length) = length_str.parse::<usize>() {
                if length > MAX_BODY_SIZE {
                    tracing::warn!("Request body too large: {} bytes", length);
                    return Err(StatusCode::PAYLOAD_TOO_LARGE);
                }
            }
        }
    }
    
    Ok(next.run(request).await)
}

/// CSRF token validation (for state-changing operations)
pub fn validate_csrf_token(headers: &HeaderMap, expected_token: &str) -> bool {
    if let Some(token) = headers.get("X-CSRF-Token") {
        if let Ok(token_str) = token.to_str() {
            return token_str == expected_token;
        }
    }
    false
}

/// Validate WebSocket origin
pub fn validate_websocket_origin(origin: &str, allowed_origins: &[String]) -> bool {
    allowed_origins.iter().any(|allowed| {
        origin == allowed || origin.starts_with(&format!("{}://", allowed))
    })
}
