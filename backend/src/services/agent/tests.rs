/**
 * Unit tests for agent system
 */
#[cfg(test)]
mod tests {
    use crate::types::{TaskType, Priority, CodebaseContext};
    use crate::services::agent::types::{Agent, AgentType, AgentStatus};
    use crate::services::agent::security::*;
    
    #[test]
    fn test_agent_creation() {
        let agent = Agent::new(
            "test-id".to_string(),
            "Test Agent".to_string(),
            AgentType::CodeGenerator,
        );
        
        assert_eq!(agent.id, "test-id");
        assert_eq!(agent.name, "Test Agent");
        assert_eq!(agent.agent_type, AgentType::CodeGenerator);
        assert_eq!(agent.status, AgentStatus::Idle);
    }
    
    #[test]
    fn test_agent_capabilities() {
        let code_gen = Agent::new(
            "1".to_string(),
            "CodeGen".to_string(),
            AgentType::CodeGenerator,
        );
        
        assert!(code_gen.can_handle_task(&TaskType::CodeGeneration));
        assert!(!code_gen.can_handle_task(&TaskType::Testing));
    }
    
    #[test]
    fn test_task_decomposition() {
        use crate::services::agent::decomposer::TaskDecomposer;
        use crate::types::AgentTask;
        use uuid::Uuid;
        
        let task = AgentTask {
            id: Uuid::new_v4().to_string(),
            r#type: TaskType::CodeGeneration,
            description: "Create a REST API".to_string(),
            context: CodebaseContext::default(),
            priority: Priority::High,
            status: crate::types::TaskStatus::Pending,
            result: None,
            error: None,
            created_at: chrono::Utc::now(),
            completed_at: None,
        };
        
        let decomposed = TaskDecomposer::decompose(task.clone());
        
        assert_eq!(decomposed.original_task.id, task.id);
        assert!(!decomposed.subtasks.is_empty());
        assert!(!decomposed.dependencies.is_empty());
    }
    
    #[test]
    fn test_security_validation() {
        let config = AgentSecurityConfig::default();
        
        // Valid task description
        assert!(validate_task_description("Create a REST API", &config).is_ok());
        
        // Too long
        let long = "a".repeat(20000);
        assert!(validate_task_description(&long, &config).is_err());
        
        // Invalid characters
        assert!(validate_task_description("test\0description", &config).is_err());
    }
    
    #[test]
    fn test_file_path_validation() {
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
    fn test_context_validation() {
        let config = AgentSecurityConfig::default();
        
        let valid_context = CodebaseContext {
            files: Some(vec![
                crate::types::FileContext {
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
    
    #[test]
    fn test_sanitization() {
        let input = "test\0description<script>alert('xss')</script>";
        let sanitized = sanitize_task_description(input);
        
        assert!(!sanitized.contains('\0'));
    }
}
