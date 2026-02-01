/**
 * Validation utilities
 * Common validation functions for security
 */
use validator::ValidationError;

/// Validate that a string is not empty and within length limits
pub fn validate_non_empty_string(value: &str, max_length: usize) -> Result<(), ValidationError> {
    if value.is_empty() {
        return Err(ValidationError::new("empty_string"));
    }
    if value.len() > max_length {
        return Err(ValidationError::new("string_too_long"));
    }
    Ok(())
}

/// Validate skill name format
pub fn validate_skill_name_format(name: &str) -> Result<(), ValidationError> {
    // Only allow alphanumeric, hyphens, underscores, dots
    if !name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == '.') {
        return Err(ValidationError::new("invalid_format"));
    }
    
    // Must start with letter
    if !name.chars().next().map(|c| c.is_alphabetic()).unwrap_or(false) {
        return Err(ValidationError::new("must_start_with_letter"));
    }
    
    Ok(())
}

/// Validate JSON value size
pub fn validate_json_size(value: &serde_json::Value, max_size: usize) -> Result<(), ValidationError> {
    let size = serde_json::to_string(value)
        .map(|s| s.len())
        .unwrap_or(0);
    
    if size > max_size {
        return Err(ValidationError::new("json_too_large"));
    }
    
    Ok(())
}

/// Sanitize file path to prevent directory traversal
pub fn sanitize_file_path(path: &str) -> Result<String, ValidationError> {
    let sanitized = path
        .replace("..", "")
        .replace("//", "/")
        .trim_start_matches('/')
        .to_string();
    
    if sanitized.contains('\0') || sanitized.contains('\n') || sanitized.contains('\r') {
        return Err(ValidationError::new("invalid_path"));
    }
    
    Ok(sanitized)
}
