/**
 * WebSocket Security
 * Validates WebSocket connections and messages
 */
use std::sync::Arc;
use crate::config::Config;

/// Validate WebSocket message
pub fn validate_websocket_message(message: &str, max_length: usize) -> Result<String, String> {
    if message.len() > max_length {
        return Err(format!("Message too long: {} bytes (max: {})", message.len(), max_length));
    }

    // Check for control characters (except newlines/tabs)
    if message.chars().any(|c| c.is_control() && c != '\n' && c != '\r' && c != '\t') {
        return Err("Invalid characters in message".to_string());
    }

    // Check for potential injection patterns
    if message.contains("<script") || message.contains("javascript:") {
        return Err("Potentially unsafe content detected".to_string());
    }

    Ok(message.to_string())
}

/// Validate WebSocket origin
pub fn validate_origin(origin: &str, config: &Config) -> bool {
    config.allowed_websocket_origins.iter().any(|allowed| {
        origin == allowed || 
        origin.starts_with(&format!("{}://", allowed)) ||
        origin == "*" // Allow all in development
    })
}

/// Sanitize WebSocket message
pub fn sanitize_websocket_message(message: &str) -> String {
    message
        .chars()
        .filter(|c| !c.is_control() || *c == '\n' || *c == '\r' || *c == '\t')
        .take(10000) // Max 10KB per message
        .collect::<String>()
        .replace("<script", "")
        .replace("</script>", "")
        .replace("javascript:", "")
}
