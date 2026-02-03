/**
 * Session Manager
 * 
 * Manages collaboration sessions - compatible with Phase 1, 2, 3
 */
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};

use crate::database::Database;
use crate::security::AuditLogger;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: Uuid,
    pub name: String,
    pub owner_id: Uuid,
    pub project_path: String,
    pub settings: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_public: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub share_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Participant {
    pub session_id: Uuid,
    pub user_id: Option<Uuid>,
    pub agent_id: Option<Uuid>,
    pub role: ParticipantRole,
    pub joined_at: DateTime<Utc>,
    pub last_active: DateTime<Utc>,
    pub cursor_position: Option<serde_json::Value>,
    pub active_file: Option<String>,
    pub status: ParticipantStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ParticipantRole {
    Owner,
    Editor,
    Viewer,
    Agent,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ParticipantStatus {
    Online,
    Away,
    Idle,
}

pub struct SessionManager {
    database: Option<Arc<Database>>,
    sessions: Arc<RwLock<HashMap<Uuid, Session>>>,
    participants: Arc<RwLock<HashMap<Uuid, Vec<Participant>>>>,
    audit_logger: Arc<AuditLogger>,
}

impl SessionManager {
    pub fn new(
        database: Option<Arc<Database>>,
        audit_logger: Arc<AuditLogger>,
    ) -> Arc<Self> {
        Arc::new(Self {
            database,
            sessions: Arc::new(RwLock::new(HashMap::new())),
            participants: Arc::new(RwLock::new(HashMap::new())),
            audit_logger,
        })
    }

    pub async fn create_session(
        &self,
        name: String,
        owner_id: Uuid,
        project_path: String,
    ) -> anyhow::Result<Session> {
        // Generate share token
        let share_token = self.generate_share_token();

        let session = Session {
            id: Uuid::new_v4(),
            name,
            owner_id,
            project_path,
            settings: serde_json::json!({}),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            expires_at: None,
            is_public: false,
            share_token: Some(share_token.clone()),
        };

        // Store in database if available
        if let Some(db) = &self.database {
            sqlx::query!(
                r#"
                INSERT INTO collaboration_sessions (id, name, owner_id, project_path, settings, is_public, share_token, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                "#,
                session.id,
                session.name,
                session.owner_id,
                session.project_path,
                session.settings,
                session.is_public,
                share_token,
                session.created_at,
                session.updated_at
            )
            .execute(db.pool())
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create session in database: {}", e))?;
        }

        // Store in memory
        {
            let mut sessions = self.sessions.write().await;
            sessions.insert(session.id, session.clone());
        }

        // Log audit event (using security event logging)
        self.audit_logger.log_violation(
            format!("Session created: {}", session.id),
            None,
            Some(serde_json::json!({
                "session_id": session.id,
                "owner_id": owner_id,
                "action": "create_session"
            })),
        ).await;

        Ok(session)
    }

    fn generate_share_token(&self) -> String {
        use rand::Rng;
        const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let mut rng = rand::thread_rng();
        (0..32)
            .map(|_| {
                let idx = rng.gen_range(0..CHARSET.len());
                CHARSET[idx] as char
            })
            .collect()
    }

    pub async fn get_session_by_token(&self, token: &str) -> Option<Session> {
        // Try database first
        if let Some(db) = &self.database {
            if let Ok(Some(row)) = sqlx::query!(
                r#"
                SELECT id, name, owner_id, project_path, settings, created_at, updated_at, expires_at, is_public, share_token
                FROM collaboration_sessions
                WHERE share_token = $1
                "#,
                token
            )
            .fetch_optional(db.pool())
            .await
            {
                if let Some(row) = row {
                    let session = Session {
                        id: row.id,
                        name: row.name,
                        owner_id: row.owner_id,
                        project_path: row.project_path,
                        settings: row.settings,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                        expires_at: row.expires_at,
                        is_public: row.is_public,
                        share_token: row.share_token,
                    };
                    return Some(session);
                }
            }
        }

        // Fallback to memory
        let sessions = self.sessions.read().await;
        sessions.values().find(|s| {
            // In-memory sessions don't have share_token, so we'd need to add it
            false
        }).cloned()
    }

    pub async fn get_session(&self, session_id: Uuid) -> Option<Session> {
        // Try database first
        if let Some(db) = &self.database {
            if let Ok(Some(row)) = sqlx::query!(
                r#"
                SELECT id, name, owner_id, project_path, settings, created_at, updated_at, expires_at, is_public, share_token
                FROM collaboration_sessions
                WHERE id = $1
                "#,
                session_id
            )
            .fetch_optional(db.pool())
            .await
            {
                if let Some(row) = row {
                    let session = Session {
                        id: row.id,
                        name: row.name,
                        owner_id: row.owner_id,
                        project_path: row.project_path,
                        settings: row.settings,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                        expires_at: row.expires_at,
                        is_public: row.is_public,
                        share_token: row.share_token,
                    };
                    // Cache in memory
                    {
                        let mut sessions = self.sessions.write().await;
                        sessions.insert(session_id, session.clone());
                    }
                    return Some(session);
                }
            }
        }

        // Fallback to memory
        let sessions = self.sessions.read().await;
        sessions.get(&session_id).cloned()
    }

    pub async fn join_session(
        &self,
        session_id: Uuid,
        user_id: Option<Uuid>,
        agent_id: Option<Uuid>,
        role: ParticipantRole,
    ) -> anyhow::Result<Participant> {
        // Verify session exists
        if self.get_session(session_id).await.is_none() {
            return Err(anyhow::anyhow!("Session not found"));
        }

        let role_str = match role {
            ParticipantRole::Owner => "owner",
            ParticipantRole::Editor => "editor",
            ParticipantRole::Viewer => "viewer",
            ParticipantRole::Agent => "agent",
        };

        let participant = Participant {
            session_id,
            user_id,
            agent_id,
            role,
            joined_at: Utc::now(),
            last_active: Utc::now(),
            cursor_position: None,
            active_file: None,
            status: ParticipantStatus::Online,
        };

        // Store in database if available
        if let Some(db) = &self.database {
            sqlx::query!(
                r#"
                INSERT INTO collaboration_participants (session_id, user_id, agent_id, role, joined_at, last_active, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT DO NOTHING
                "#,
                session_id,
                user_id,
                agent_id,
                role_str,
                participant.joined_at,
                participant.last_active,
                "online"
            )
            .execute(db.pool())
            .await
            .map_err(|e| anyhow::anyhow!("Failed to join session in database: {}", e))?;
        }

        // Add to participants
        {
            let mut participants = self.participants.write().await;
            participants.entry(session_id)
                .or_insert_with(Vec::new)
                .push(participant.clone());
        }

        // Log audit event
        self.audit_logger.log_violation(
            format!("Joined session: {}", session_id),
            None,
            Some(serde_json::json!({
                "session_id": session_id,
                "user_id": user_id,
                "agent_id": agent_id,
                "action": "join_session"
            })),
        ).await;

        Ok(participant)
    }

    pub async fn leave_session(
        &self,
        session_id: Uuid,
        user_id: Option<Uuid>,
        agent_id: Option<Uuid>,
    ) -> anyhow::Result<()> {
        // Remove from participants
        {
            let mut participants = self.participants.write().await;
            if let Some(participants_list) = participants.get_mut(&session_id) {
                participants_list.retain(|p| {
                    p.user_id != user_id || p.agent_id != agent_id
                });
            }
        }

        // Log audit event
        self.audit_logger.log_violation(
            format!("Left session: {}", session_id),
            None,
            Some(serde_json::json!({
                "session_id": session_id,
                "user_id": user_id,
                "agent_id": agent_id,
                "action": "leave_session"
            })),
        ).await;

        Ok(())
    }

    pub async fn get_participants(&self, session_id: Uuid) -> Vec<Participant> {
        let participants = self.participants.read().await;
        participants.get(&session_id).cloned().unwrap_or_default()
    }

    pub async fn update_presence(
        &self,
        session_id: Uuid,
        user_id: Option<Uuid>,
        agent_id: Option<Uuid>,
        cursor_position: Option<serde_json::Value>,
        active_file: Option<String>,
    ) -> anyhow::Result<()> {
        let mut participants = self.participants.write().await;
        if let Some(participants_list) = participants.get_mut(&session_id) {
            for p in participants_list.iter_mut() {
                if (p.user_id == user_id && user_id.is_some()) ||
                   (p.agent_id == agent_id && agent_id.is_some()) {
                    p.cursor_position = cursor_position.clone();
                    p.active_file = active_file.clone();
                    p.last_active = Utc::now();
                    break;
                }
            }
        }
        Ok(())
    }
}
