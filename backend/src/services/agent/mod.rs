/**
 * Agent System - Multi-agent orchestration for Bloop
 * 
 * Phase 2: Agent System Implementation
 * - Multi-agent orchestration engine
 * - Task decomposition
 * - Parallel execution
 * - Agent communication
 * - Specialized agent types
 */

pub mod manager;
pub mod executor;
pub mod decomposer;
pub mod types;
pub mod security;
pub mod timeout;
pub mod monitoring;
pub mod fault_tolerance;
pub mod queue;

#[cfg(test)]
mod tests;

pub use fault_tolerance::*;
pub use queue::*;

pub use manager::AgentManager;
pub use executor::AgentExecutor;
pub use decomposer::TaskDecomposer;
pub use types::*;
pub use security::*;
pub use timeout::*;
