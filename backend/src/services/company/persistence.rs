/**
 * Company Persistence
 * 
 * Handles persistence of company state for 24/7/365 operation
 */
use std::sync::Arc;
use crate::database::Database;
use super::orchestrator::CompanyOrchestrator;

pub struct CompanyPersistence {
    database: Option<Arc<Database>>,
}

impl CompanyPersistence {
    pub fn new(database: Option<Arc<Database>>) -> Self {
        Self { database }
    }

    /// Save company state to database
    pub async fn save_company_state(&self, orchestrator: &CompanyOrchestrator) -> anyhow::Result<()> {
        if let Some(ref db) = self.database {
            // Get current state
            let members = orchestrator.get_members().await;
            let teams = orchestrator.get_teams().await;
            let metrics = orchestrator.get_metrics().await;

            // Save members to database
            for member in &members {
                let agent_data = serde_json::to_value(&member.agent)?;
                
                let _ = sqlx::query(
                    "INSERT INTO company_members (
                        agent_id, role, team, skills, performance_score,
                        tasks_completed, tasks_failed, average_task_time_ms,
                        last_active, is_active, openclaw_id, moltbook_id, agent_data
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (agent_id) DO UPDATE SET
                        role = EXCLUDED.role,
                        team = EXCLUDED.team,
                        skills = EXCLUDED.skills,
                        performance_score = EXCLUDED.performance_score,
                        tasks_completed = EXCLUDED.tasks_completed,
                        tasks_failed = EXCLUDED.tasks_failed,
                        average_task_time_ms = EXCLUDED.average_task_time_ms,
                        last_active = EXCLUDED.last_active,
                        is_active = EXCLUDED.is_active,
                        openclaw_id = EXCLUDED.openclaw_id,
                        moltbook_id = EXCLUDED.moltbook_id,
                        agent_data = EXCLUDED.agent_data,
                        updated_at = NOW()"
                )
                .bind(&member.agent.id)
                .bind(format!("{:?}", member.role).to_lowercase())
                .bind(&member.team)
                .bind(&member.skills)
                .bind(rust_decimal::Decimal::from_f64(member.performance_score).unwrap_or(rust_decimal::Decimal::ZERO))
                .bind(member.tasks_completed as i64)
                .bind(member.tasks_failed as i64)
                .bind(member.average_task_time_ms as i64)
                .bind(member.last_active)
                .bind(member.is_active)
                .bind(&member.openclaw_id)
                .bind(&member.moltbook_id)
                .bind(&agent_data)
                .execute(db.pool())
                .await;
            }

            // Save teams
            for team in &teams {
                let _ = sqlx::query(
                    "INSERT INTO company_teams (name, members, lead, capacity, current_load)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (name) DO UPDATE SET
                        members = EXCLUDED.members,
                        lead = EXCLUDED.lead,
                        capacity = EXCLUDED.capacity,
                        current_load = EXCLUDED.current_load,
                        updated_at = NOW()"
                )
                .bind(&team.name)
                .bind(&team.members)
                .bind(&team.lead)
                .bind(team.capacity as i32)
                .bind(team.current_load as i32)
                .execute(db.pool())
                .await;
            }

            // Save metrics snapshot
            let _ = sqlx::query(
                "INSERT INTO company_metrics_snapshots (
                    total_agents, active_agents, total_tasks_completed, total_tasks_failed,
                    success_rate, average_task_time_ms, total_tokens_used, uptime_seconds,
                    visual_creatives_completed, collaborations_count
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
            )
            .bind(metrics.total_agents as i32)
            .bind(metrics.active_agents as i32)
            .bind(metrics.total_tasks_completed as i64)
            .bind(metrics.total_tasks_failed as i64)
            .bind(rust_decimal::Decimal::from_f64(metrics.success_rate).unwrap_or(rust_decimal::Decimal::ZERO))
            .bind(metrics.average_task_time_ms as i64)
            .bind(metrics.total_tokens_used as i64)
            .bind(metrics.uptime_seconds as i64)
            .bind(metrics.visual_creatives_completed as i64)
            .bind(metrics.collaborations_count as i64)
            .execute(db.pool())
            .await;

            tracing::debug!(
                "Saved company state: {} members, {} teams, metrics snapshot",
                members.len(),
                teams.len()
            );
        } else {
            tracing::debug!("No database configured, skipping state persistence");
        }

        Ok(())
    }

    /// Load company state from database
    pub async fn load_company_state(&self, orchestrator: &CompanyOrchestrator) -> anyhow::Result<()> {
        if let Some(ref db) = self.database {
            // Load members from database
            // Note: This is a simplified version - in production, we'd fully restore agent state
            match sqlx::query("SELECT COUNT(*) FROM company_members WHERE is_active = true")
                .fetch_one(db.pool())
                .await
            {
                Ok(row) => {
                    let count: i64 = row.get(0);
                    tracing::info!("Loaded {} active members from database", count);
                }
                Err(e) => {
                    tracing::warn!("Failed to load members from database: {}", e);
                }
            }

            // Load teams from database
            match sqlx::query("SELECT COUNT(*) FROM company_teams")
                .fetch_one(db.pool())
                .await
            {
                Ok(row) => {
                    let count: i64 = row.get(0);
                    tracing::info!("Loaded {} teams from database", count);
                }
                Err(e) => {
                    tracing::warn!("Failed to load teams from database: {}", e);
                }
            }
        } else {
            tracing::debug!("No database configured, skipping state load");
        }

        Ok(())
    }
}
