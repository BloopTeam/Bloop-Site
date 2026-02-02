/**
 * Agent Collaborator
 * 
 * Integrates agents into collaboration sessions
 * Extends Phase 1 AgentManager and Phase 3 CompanyOrchestrator
 */
use std::sync::Arc;
use uuid::Uuid;

use crate::services::agent::AgentManager;
use crate::services::company::CompanyOrchestrator;
use crate::services::integrations::OpenClawWebSocketClient;
use super::session::SessionManager;

pub struct AgentCollaborator {
    agent_manager: Arc<AgentManager>,
    company_orchestrator: Arc<CompanyOrchestrator>,
    openclaw_client: Option<Arc<OpenClawWebSocketClient>>,
    session_manager: Arc<SessionManager>,
}

impl AgentCollaborator {
    pub fn new(
        agent_manager: Arc<AgentManager>,
        company_orchestrator: Arc<CompanyOrchestrator>,
        openclaw_client: Option<Arc<OpenClawWebSocketClient>>,
        session_manager: Arc<SessionManager>,
    ) -> Arc<Self> {
        Arc::new(Self {
            agent_manager,
            company_orchestrator,
            openclaw_client,
            session_manager,
        })
    }

    pub async fn add_agent_to_session(
        &self,
        session_id: Uuid,
        agent_id: String,
    ) -> anyhow::Result<()> {
        // Join session as agent participant
        self.session_manager.join_session(
            session_id,
            None, // user_id
            Some(Uuid::parse_str(&agent_id)?), // agent_id
            super::session::ParticipantRole::Agent,
        ).await?;

        Ok(())
    }

    pub async fn remove_agent_from_session(
        &self,
        session_id: Uuid,
        agent_id: String,
    ) -> anyhow::Result<()> {
        // Leave session
        self.session_manager.leave_session(
            session_id,
            None, // user_id
            Some(Uuid::parse_str(&agent_id)?), // agent_id
        ).await?;

        Ok(())
    }

    pub async fn get_agent_activity(
        &self,
        session_id: Uuid,
    ) -> Vec<String> {
        // Get agent participants in session
        let participants = self.session_manager.get_participants(session_id).await;
        participants
            .into_iter()
            .filter(|p| p.agent_id.is_some())
            .map(|p| p.agent_id.unwrap().to_string())
            .collect()
    }
}
