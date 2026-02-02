/**
 * Company API route handlers
 * Provides endpoints for managing the autonomous agent company
 */
use axum::{
    extract::Extension,
    http::StatusCode,
    response::Json,
};
use serde::Serialize;
use std::sync::Arc;
use crate::services::company::CompanyOrchestrator;
use crate::services::company::types::*;
use crate::types::errors::{ApiError, ApiResult};

#[derive(Debug, Serialize)]
pub struct CompanyStatus {
    pub metrics: CompanyMetrics,
    pub members_count: usize,
    pub teams_count: usize,
    pub is_running: bool,
}

/// Get company status and metrics
pub async fn get_status(
    Extension(orchestrator): Extension<Arc<CompanyOrchestrator>>,
) -> ApiResult<Json<CompanyStatus>> {
    let metrics = orchestrator.get_metrics().await;
    let members = orchestrator.get_members().await;
    let teams = orchestrator.get_teams().await;

    let is_running = orchestrator.is_running().await;

    Ok(Json(CompanyStatus {
        metrics,
        members_count: members.len(),
        teams_count: teams.len(),
        is_running,
    }))
}

/// Get all company members
pub async fn get_members(
    Extension(orchestrator): Extension<Arc<CompanyOrchestrator>>,
) -> ApiResult<Json<Vec<CompanyMember>>> {
    let members = orchestrator.get_members().await;
    Ok(Json(members))
}

/// Get all teams
pub async fn get_teams(
    Extension(orchestrator): Extension<Arc<CompanyOrchestrator>>,
) -> ApiResult<Json<Vec<Team>>> {
    let teams = orchestrator.get_teams().await;
    Ok(Json(teams))
}
