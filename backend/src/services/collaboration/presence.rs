/**
 * Presence Tracker
 * 
 * Tracks user and agent presence in sessions
 * Compatible with Phase 1, 2, 3
 */
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};

use super::session::{ParticipantStatus, Participant};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Presence {
    pub user_id: Option<Uuid>,
    pub agent_id: Option<Uuid>,
    pub session_id: Uuid,
    pub status: ParticipantStatus,
    pub cursor_position: Option<serde_json::Value>,
    pub active_file: Option<String>,
    pub last_active: DateTime<Utc>,
}

pub struct PresenceTracker {
    presence: Arc<RwLock<HashMap<Uuid, Vec<Presence>>>>, // session_id -> presences
}

impl PresenceTracker {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            presence: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    pub async fn update_presence(
        &self,
        session_id: Uuid,
        user_id: Option<Uuid>,
        agent_id: Option<Uuid>,
        status: ParticipantStatus, // From session module
        cursor_position: Option<serde_json::Value>,
        active_file: Option<String>,
    ) {
        let mut presence_map = self.presence.write().await;
        let presences = presence_map.entry(session_id).or_insert_with(Vec::new);

        // Update or add presence
        if let Some(p) = presences.iter_mut().find(|p| {
            (p.user_id == user_id && user_id.is_some()) ||
            (p.agent_id == agent_id && agent_id.is_some())
        }) {
            p.status = status;
            p.cursor_position = cursor_position;
            p.active_file = active_file;
            p.last_active = Utc::now();
        } else {
            presences.push(Presence {
                user_id,
                agent_id,
                session_id,
                status,
                cursor_position,
                active_file,
                last_active: Utc::now(),
            });
        }
    }

    pub async fn get_presences(&self, session_id: Uuid) -> Vec<Presence> {
        let presence_map = self.presence.read().await;
        presence_map.get(&session_id).cloned().unwrap_or_default()
    }

    pub async fn remove_presence(
        &self,
        session_id: Uuid,
        user_id: Option<Uuid>,
        agent_id: Option<Uuid>,
    ) {
        let mut presence_map = self.presence.write().await;
        if let Some(presences) = presence_map.get_mut(&session_id) {
            presences.retain(|p| {
                p.user_id != user_id || p.agent_id != agent_id
            });
        }
    }
}
