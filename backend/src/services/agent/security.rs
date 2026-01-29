/**
 * Agent Security Module
 * 
 * Security measures for agent system:
 * - Input validation and sanitization
 * - Resource limits
 * - Task validation
 * - Context validation
 */
use crate::types::{AgentTask, CodebaseContext, FileContext};
use validator::{Validate, ValidationError};
use std::collections::HashMap;

/// Security configuration for agents
#[derive(Debug, Clone)]
pub struct AgentSecurityConfig {
    pub max_task_description_length: usize,
    pub max_agents_per_user: usize,
    pub max_tasks_per_user: usize,
    pub max_file_context_size: usize,
    pub max_files_per_context: usize,
    pub allowed_file_extensions: Vec<String>,
    pub max_context_size_bytes: usize,
}

impl Default for AgentSecurityConfig {
    fn default() -> Self {
        Self {
            max_task_description_length: 10000,
            max_agents_per_user: 500, // 10x increase: 50 -> 500
            max_tasks_per_user: 1000, // 10x increase: 100 -> 1000
            max_file_context_size: 1_000_000, // 1MB per file
            max_files_per_context: 100,
            allowed_file_extensions: vec![
                "rs".to_string(), "ts".to_string(), "js".to_string(),
                "tsx".to_string(), "jsx".to_string(), "py".to_string(),
                "java".to_string(), "go".to_string(), "cpp".to_string(),
                "c".to_string(), "h".to_string(), "hpp".to_string(),
                "md".to_string(), "json".to_string(), "yaml".to_string(),
                "yml".to_string(), "toml".to_string(), "xml".to_string(),
                "html".to_string(), "css".to_string(), "scss".to_string(),
            ],
            max_context_size_bytes: 10_000_000, // 10MB total context
        }
    }
}

/// Validation errors
#[derive(Debug, thiserror::Error)]
pub enum AgentSecurityError {
    #[error("Task description too long: {0} characters (max: {1})")]
    TaskDescriptionTooLong(usize, usize),
    
    #[error("Too many agents: {0} (max: {1})")]
    TooManyAgents(usize, usize),
    
    #[error("Too many tasks: {0} (max: {1})")]
    TooManyTasks(usize, usize),
    
    #[error("File too large: {0} bytes (max: {1})")]
    FileTooLarge(usize, usize),
    
    #[error("Too many files in context: {0} (max: {1})")]
    TooManyFiles(usize, usize),
    
    #[error("Context too large: {0} bytes (max: {1})")]
    ContextTooLarge(usize, usize),
    
    #[error("Invalid file extension: {0}")]
    InvalidFileExtension(String),
    
    #[error("Invalid file path: {0}")]
    InvalidFilePath(String),
    
    #[error("Task description contains invalid characters")]
    InvalidTaskDescription,
    
    #[error("Context contains invalid data")]
    InvalidContext,
}

/// Validate task description
pub fn validate_task_description(
    description: &str,
    config: &AgentSecurityConfig,
) -> Result<(), AgentSecurityError> {
    // Check length
    if description.len() > config.max_task_description_length {
        return Err(AgentSecurityError::TaskDescriptionTooLong(
            description.len(),
            config.max_task_description_length,
        ));
    }
    
    // Check for dangerous patterns
    let dangerous_patterns = [
        "rm -rf",
        "sudo",
        "chmod 777",
        "eval(",
        "exec(",
        "system(",
        "shell_exec",
        "<script",
        "javascript:",
        "onerror=",
        "onload=",
    ];
    
    let description_lower = description.to_lowercase();
    for pattern in &dangerous_patterns {
        if description_lower.contains(pattern) {
            tracing::warn!("Dangerous pattern detected in task description: {}", pattern);
            // Don't block, but log warning
        }
    }
    
    // Check for null bytes
    if description.contains('\0') {
        return Err(AgentSecurityError::InvalidTaskDescription);
    }
    
    Ok(())
}

/// Validate codebase context
pub fn validate_context(
    context: &CodebaseContext,
    config: &AgentSecurityConfig,
) -> Result<(), AgentSecurityError> {
    let mut total_size = 0;
    
    // Validate files
    if let Some(files) = &context.files {
        if files.len() > config.max_files_per_context {
            return Err(AgentSecurityError::TooManyFiles(
                files.len(),
                config.max_files_per_context,
            ));
        }
        
        for file in files {
            // Validate file path
            validate_file_path(&file.path)?;
            
            // Validate file extension
            validate_file_extension(&file.path, config)?;
            
            // Validate file size
            let file_size = file.content.len();
            if file_size > config.max_file_context_size {
                return Err(AgentSecurityError::FileTooLarge(
                    file_size,
                    config.max_file_context_size,
                ));
            }
            
            total_size += file_size;
            
            // Validate file content (no null bytes)
            if file.content.contains('\0') {
                return Err(AgentSecurityError::InvalidContext);
            }
        }
    }
    
    // Check total context size
    if total_size > config.max_context_size_bytes {
        return Err(AgentSecurityError::ContextTooLarge(
            total_size,
            config.max_context_size_bytes,
        ));
    }
    
    Ok(())
}

/// Validate file path (prevent path traversal)
fn validate_file_path(path: &str) -> Result<(), AgentSecurityError> {
    // Prevent path traversal
    if path.contains("..") {
        return Err(AgentSecurityError::InvalidFilePath(
            "Path traversal detected".to_string(),
        ));
    }
    
    // Prevent absolute paths on Windows
    if path.starts_with("C:\\") || path.starts_with("D:\\") || path.starts_with("\\") {
        return Err(AgentSecurityError::InvalidFilePath(
            "Absolute paths not allowed".to_string(),
        ));
    }
    
    // Prevent absolute paths on Unix
    if path.starts_with('/') && !path.starts_with("./") {
        return Err(AgentSecurityError::InvalidFilePath(
            "Absolute paths not allowed".to_string(),
        ));
    }
    
    // Prevent null bytes
    if path.contains('\0') {
        return Err(AgentSecurityError::InvalidFilePath(
            "Null bytes not allowed".to_string(),
        ));
    }
    
    Ok(())
}

/// Validate file extension
fn validate_file_extension(
    path: &str,
    config: &AgentSecurityConfig,
) -> Result<(), AgentSecurityError> {
    if let Some(ext) = path.split('.').last() {
        let ext_lower = ext.to_lowercase();
        if !config.allowed_file_extensions.contains(&ext_lower) {
            return Err(AgentSecurityError::InvalidFileExtension(ext.to_string()));
        }
    }
    
    Ok(())
}

/// Validate agent count
pub fn validate_agent_count(
    current_count: usize,
    config: &AgentSecurityConfig,
) -> Result<(), AgentSecurityError> {
    if current_count >= config.max_agents_per_user {
        return Err(AgentSecurityError::TooManyAgents(
            current_count,
            config.max_agents_per_user,
        ));
    }
    
    Ok(())
}

/// Validate task count
pub fn validate_task_count(
    current_count: usize,
    config: &AgentSecurityConfig,
) -> Result<(), AgentSecurityError> {
    if current_count >= config.max_tasks_per_user {
        return Err(AgentSecurityError::TooManyTasks(
            current_count,
            config.max_tasks_per_user,
        ));
    }
    
    Ok(())
}

/// Sanitize task description
pub fn sanitize_task_description(description: &str) -> String {
    // Remove null bytes
    description.replace('\0', "")
        // Remove control characters except newlines and tabs
        .chars()
        .filter(|c| !c.is_control() || *c == '\n' || *c == '\t' || *c == '\r')
        .collect()
}

/// Sanitize file content
pub fn sanitize_file_content(content: &str) -> String {
    // Remove null bytes
    content.replace('\0', "")
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validate_task_description() {
        let config = AgentSecurityConfig::default();
        
        // Valid description
        assert!(validate_task_description("Create a REST API", &config).is_ok());
        
        // Too long
        let long_desc = "a".repeat(20000);
        assert!(validate_task_description(&long_desc, &config).is_err());
        
        // Contains null byte
        assert!(validate_task_description("test\0description", &config).is_err());
    }
    
    #[test]
    fn test_validate_file_path() {
        // Valid paths
        assert!(validate_file_path("src/main.rs").is_ok());
        assert!(validate_file_path("./src/main.rs").is_ok());
        
        // Path traversal
        assert!(validate_file_path("../etc/passwd").is_err());
        assert!(validate_file_path("../../etc/passwd").is_err());
        
        // Absolute paths
        assert!(validate_file_path("/etc/passwd").is_err());
        assert!(validate_file_path("C:\\Windows\\System32").is_err());
    }
    
    #[test]
    fn test_validate_context() {
        let config = AgentSecurityConfig::default();
        
        let valid_context = CodebaseContext {
            files: Some(vec![
                FileContext {
                    path: "src/main.rs".to_string(),
                    content: "fn main() {}".to_string(),
                    language: "rust".to_string(),
                    start_line: None,
                    end_line: None,
                }
            ]),
            symbols: None,
            dependencies: None,
            structure: None,
        };
        
        assert!(validate_context(&valid_context, &config).is_ok());
    }
}
