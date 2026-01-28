/**
 * Chat API route handler
 */
use axum::{
    extract::Extension,
    http::StatusCode,
    response::Json,
};
use crate::types::AIRequest;
use crate::services::ai::router::ModelRouter;
use crate::config::Config;

pub async fn handle_chat(
    Extension(config): Extension<Config>,
    Extension(router): Extension<ModelRouter>,
    Json(request): Json<AIRequest>,
) -> Result<Json<crate::types::AIResponse>, StatusCode> {
    // Select best model
    let model_info = router.select_best_model(&request)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Get service
    let service = router.get_service(model_info.provider.clone())
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    
    // Generate response
    let response = service.generate(request).await
        .map_err(|e| {
            tracing::error!("AI service error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    Ok(Json(response))
}
