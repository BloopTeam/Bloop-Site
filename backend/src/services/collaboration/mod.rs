/**
 * Real-Time Collaboration Services
 * 
 * Provides shared context for users and agents in live sessions
 * Compatible with Phase 1 (AI/Agents), Phase 2 (Security/Database), Phase 3 (Company/Code Intelligence)
 */
pub mod websocket;
pub mod session;
pub mod conflict;
pub mod presence;
pub mod agent;
pub mod codeintel;

pub use websocket::CollaborationWebSocket;
pub use session::SessionManager;
pub use conflict::ConflictResolver;
pub use presence::PresenceTracker;
pub use agent::AgentCollaborator;
pub use codeintel::CodeIntelligenceSync;
