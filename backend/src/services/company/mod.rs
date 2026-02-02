/**
 * Autonomous Agent Company System
 * 
 * Manages a full company of agents that work independently 24/7/365
 * based on user demand, with visual creative capabilities and
 * integration with OpenClaw and Moltbook.
 */
pub mod orchestrator;
pub mod demand;
pub mod visual;
pub mod collaboration;
pub mod persistence;
pub mod health;
pub mod types;
pub mod scaling;

pub use orchestrator::CompanyOrchestrator;
pub use types::*;
pub use scaling::PredictiveScaler;
