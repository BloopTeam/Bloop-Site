/**
 * Task Decomposition Engine
 * 
 * Breaks complex tasks into smaller, manageable subtasks
 * that can be assigned to specialized agents.
 */
use crate::types::{AgentTask, TaskType, Priority, CodebaseContext};
use super::types::{DecomposedTask, SubTask, TaskDependency, DependencyType, AgentType};
use uuid::Uuid;

pub struct TaskDecomposer;

impl TaskDecomposer {
    /// Decompose a complex task into subtasks
    pub fn decompose(task: AgentTask) -> DecomposedTask {
        let subtasks = match task.r#type {
            TaskType::CodeGeneration => Self::decompose_code_generation(&task),
            TaskType::Refactoring => Self::decompose_refactoring(&task),
            TaskType::Debugging => Self::decompose_debugging(&task),
            TaskType::Testing => Self::decompose_testing(&task),
            TaskType::Documentation => Self::decompose_documentation(&task),
            TaskType::CodeAnalysis => Self::decompose_analysis(&task),
        };

        let dependencies = Self::build_dependencies(&subtasks);

        DecomposedTask {
            original_task: task,
            subtasks,
            dependencies,
        }
    }

    fn decompose_code_generation(task: &AgentTask) -> Vec<SubTask> {
        vec![
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: format!("Analyze requirements: {}", task.description),
                task_type: TaskType::CodeAnalysis,
                priority: task.priority.clone(),
                assigned_agent_type: Some(AgentType::CodeAnalyzer),
                dependencies: vec![],
                context: task.context.clone(),
            },
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: task.description.clone(),
                task_type: TaskType::CodeGeneration,
                priority: task.priority.clone(),
                assigned_agent_type: Some(AgentType::CodeGenerator),
                dependencies: vec![], // Will be set by dependency builder
                context: task.context.clone(),
            },
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: format!("Review generated code for: {}", task.description),
                task_type: TaskType::CodeAnalysis,
                priority: Priority::High,
                assigned_agent_type: Some(AgentType::Reviewer),
                dependencies: vec![], // Depends on code generation
                context: task.context.clone(),
            },
        ]
    }

    fn decompose_refactoring(task: &AgentTask) -> Vec<SubTask> {
        vec![
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: format!("Analyze code structure: {}", task.description),
                task_type: TaskType::CodeAnalysis,
                priority: task.priority.clone(),
                assigned_agent_type: Some(AgentType::CodeAnalyzer),
                dependencies: vec![],
                context: task.context.clone(),
            },
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: task.description.clone(),
                task_type: TaskType::Refactoring,
                priority: task.priority.clone(),
                assigned_agent_type: Some(AgentType::Refactorer),
                dependencies: vec![], // Depends on analysis
                context: task.context.clone(),
            },
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: format!("Verify refactoring: {}", task.description),
                task_type: TaskType::Testing,
                priority: Priority::High,
                assigned_agent_type: Some(AgentType::Tester),
                dependencies: vec![], // Depends on refactoring
                context: task.context.clone(),
            },
        ]
    }

    fn decompose_debugging(task: &AgentTask) -> Vec<SubTask> {
        vec![
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: format!("Identify bug: {}", task.description),
                task_type: TaskType::CodeAnalysis,
                priority: Priority::Urgent,
                assigned_agent_type: Some(AgentType::Debugger),
                dependencies: vec![],
                context: task.context.clone(),
            },
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: format!("Fix bug: {}", task.description),
                task_type: TaskType::Debugging,
                priority: Priority::Urgent,
                assigned_agent_type: Some(AgentType::Debugger),
                dependencies: vec![], // Depends on identification
                context: task.context.clone(),
            },
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: format!("Test fix: {}", task.description),
                task_type: TaskType::Testing,
                priority: Priority::High,
                assigned_agent_type: Some(AgentType::Tester),
                dependencies: vec![], // Depends on fix
                context: task.context.clone(),
            },
        ]
    }

    fn decompose_testing(task: &AgentTask) -> Vec<SubTask> {
        vec![
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: format!("Analyze code to test: {}", task.description),
                task_type: TaskType::CodeAnalysis,
                priority: task.priority.clone(),
                assigned_agent_type: Some(AgentType::CodeAnalyzer),
                dependencies: vec![],
                context: task.context.clone(),
            },
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: task.description.clone(),
                task_type: TaskType::Testing,
                priority: task.priority.clone(),
                assigned_agent_type: Some(AgentType::Tester),
                dependencies: vec![], // Depends on analysis
                context: task.context.clone(),
            },
        ]
    }

    fn decompose_documentation(task: &AgentTask) -> Vec<SubTask> {
        vec![
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: format!("Analyze code for documentation: {}", task.description),
                task_type: TaskType::CodeAnalysis,
                priority: task.priority.clone(),
                assigned_agent_type: Some(AgentType::CodeAnalyzer),
                dependencies: vec![],
                context: task.context.clone(),
            },
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: task.description.clone(),
                task_type: TaskType::Documentation,
                priority: task.priority.clone(),
                assigned_agent_type: Some(AgentType::Documenter),
                dependencies: vec![], // Depends on analysis
                context: task.context.clone(),
            },
        ]
    }

    fn decompose_analysis(task: &AgentTask) -> Vec<SubTask> {
        vec![
            SubTask {
                id: Uuid::new_v4().to_string(),
                parent_id: task.id.clone(),
                description: task.description.clone(),
                task_type: TaskType::CodeAnalysis,
                priority: task.priority.clone(),
                assigned_agent_type: Some(AgentType::CodeAnalyzer),
                dependencies: vec![],
                context: task.context.clone(),
            },
        ]
    }

    fn build_dependencies(subtasks: &[SubTask]) -> Vec<TaskDependency> {
        let mut dependencies = Vec::new();

        // Build sequential dependencies based on task order
        // First task has no dependencies
        // Subsequent tasks depend on previous ones
        for (i, subtask) in subtasks.iter().enumerate() {
            if i > 0 {
                let prev_subtasks: Vec<String> = subtasks[..i]
                    .iter()
                    .map(|st| st.id.clone())
                    .collect();

                dependencies.push(TaskDependency {
                    task_id: subtask.id.clone(),
                    depends_on: prev_subtasks,
                    dependency_type: DependencyType::Sequential,
                });
            }
        }

        dependencies
    }
}
