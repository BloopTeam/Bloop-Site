/**
 * Structured error types and responses
 * Provides consistent error handling across the API
 */
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;

/// API Error types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    pub error: ErrorDetails,
    pub request_id: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorDetails {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
}

impl ApiError {
    pub fn new(code: String, message: String) -> Self {
        Self {
            error: ErrorDetails {
                code,
                message,
                details: None,
                field: None,
            },
            request_id: Uuid::new_v4().to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }

    pub fn with_details(mut self, details: String) -> Self {
        self.error.details = Some(details);
        self
    }

    pub fn with_field(mut self, field: String) -> Self {
        self.error.field = Some(field);
        self
    }

    pub fn with_request_id(mut self, request_id: String) -> Self {
        self.request_id = request_id;
        self
    }
}

/// Common error codes
pub mod error_codes {
    pub const VALIDATION_ERROR: &str = "VALIDATION_ERROR";
    pub const NOT_FOUND: &str = "NOT_FOUND";
    pub const UNAUTHORIZED: &str = "UNAUTHORIZED";
    pub const FORBIDDEN: &str = "FORBIDDEN";
    pub const RATE_LIMIT_EXCEEDED: &str = "RATE_LIMIT_EXCEEDED";
    pub const INTERNAL_ERROR: &str = "INTERNAL_ERROR";
    pub const DATABASE_ERROR: &str = "DATABASE_ERROR";
    pub const EXTERNAL_SERVICE_ERROR: &str = "EXTERNAL_SERVICE_ERROR";
    pub const INVALID_INPUT: &str = "INVALID_INPUT";
    pub const PAYLOAD_TOO_LARGE: &str = "PAYLOAD_TOO_LARGE";
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = match self.error.code.as_str() {
            error_codes::VALIDATION_ERROR | error_codes::INVALID_INPUT => StatusCode::BAD_REQUEST,
            error_codes::NOT_FOUND => StatusCode::NOT_FOUND,
            error_codes::UNAUTHORIZED => StatusCode::UNAUTHORIZED,
            error_codes::FORBIDDEN => StatusCode::FORBIDDEN,
            error_codes::RATE_LIMIT_EXCEEDED => StatusCode::TOO_MANY_REQUESTS,
            error_codes::PAYLOAD_TOO_LARGE => StatusCode::PAYLOAD_TOO_LARGE,
            error_codes::DATABASE_ERROR => StatusCode::SERVICE_UNAVAILABLE,
            error_codes::EXTERNAL_SERVICE_ERROR => StatusCode::BAD_GATEWAY,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        };

        let body = Json(self);
        (status, body).into_response()
    }
}

/// Error result type
pub type ApiResult<T> = Result<T, ApiError>;

/// Helper functions for common errors
impl ApiError {
    pub fn validation_error(message: String) -> Self {
        Self::new(error_codes::VALIDATION_ERROR.to_string(), message)
    }

    pub fn not_found(resource: &str) -> Self {
        Self::new(
            error_codes::NOT_FOUND.to_string(),
            format!("{} not found", resource),
        )
    }

    pub fn unauthorized() -> Self {
        Self::new(
            error_codes::UNAUTHORIZED.to_string(),
            "Authentication required".to_string(),
        )
    }

    pub fn forbidden() -> Self {
        Self::new(
            error_codes::FORBIDDEN.to_string(),
            "Access denied".to_string(),
        )
    }

    pub fn rate_limit_exceeded() -> Self {
        Self::new(
            error_codes::RATE_LIMIT_EXCEEDED.to_string(),
            "Rate limit exceeded".to_string(),
        )
    }

    pub fn database_error(message: String) -> Self {
        Self::new(error_codes::DATABASE_ERROR.to_string(), message)
            .with_details("Database operation failed".to_string())
    }

    pub fn internal_error(message: String) -> Self {
        Self::new(error_codes::INTERNAL_ERROR.to_string(), message)
    }

    pub fn external_service_error(service: &str, message: String) -> Self {
        Self::new(
            error_codes::EXTERNAL_SERVICE_ERROR.to_string(),
            format!("{} service error: {}", service, message),
        )
    }
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "[{}] {}: {}",
            self.error.code, self.error.message, self.request_id
        )
    }
}

impl std::error::Error for ApiError {}
