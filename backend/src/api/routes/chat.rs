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
use std::sync::Arc;

pub async fn handle_chat(
    Extension(_config): Extension<Config>,
    Extension(router): Extension<Arc<ModelRouter>>,
    Json(request): Json<AIRequest>,
) -> Result<Json<crate::types::AIResponse>, StatusCode> {
    // Select best model
    let model_info = router.select_best_model(&request)
        .map_err(|e| {
            tracing::error!("Model selection error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    // Try primary model first, with fallback to alternatives
    let mut tried_providers = Vec::new();
    
    // Try primary provider
    if let Some(service) = router.get_service(model_info.provider.clone()) {
        tried_providers.push(model_info.provider.clone());
        match service.generate(request.clone_for_fallback()).await {
            Ok(response) => {
                tracing::info!("Successfully used provider: {:?}", model_info.provider);
                return Ok(Json(response));
            }
            Err(e) => {
                tracing::warn!("Primary provider {:?} failed: {}", model_info.provider, e);
            }
        }
    }
    
    // Fallback: Try other available providers
    let fallback_providers = vec![
        crate::types::ModelProvider::OpenAI,
        crate::types::ModelProvider::Anthropic,
        crate::types::ModelProvider::Google,
        crate::types::ModelProvider::Moonshot,
        crate::types::ModelProvider::DeepSeek,
        crate::types::ModelProvider::Mistral,
        crate::types::ModelProvider::XAI,
        crate::types::ModelProvider::Together,
        crate::types::ModelProvider::Anyscale,
    ];
    
    for provider in fallback_providers {
        if tried_providers.contains(&provider) {
            continue;
        }
        
        if let Some(service) = router.get_service(provider.clone()) {
            tried_providers.push(provider.clone());
            tracing::info!("Trying fallback provider: {:?}", provider);
            match service.generate(request.clone_for_fallback()).await {
                Ok(response) => {
                    tracing::info!("Fallback provider {:?} succeeded", provider);
                    return Ok(Json(response));
                }
                Err(e) => {
                    tracing::warn!("Fallback provider {:?} failed: {}", provider, e);
                }
            }
        }
    }
    
    // All providers failed
    tracing::error!("All providers failed. Tried: {:?}", tried_providers);
    Err(StatusCode::SERVICE_UNAVAILABLE)
}
