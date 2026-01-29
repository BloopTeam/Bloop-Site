/**
 * Models API route handler
 * Lists all available models and their capabilities
 */
use axum::{
    extract::Extension,
    http::StatusCode,
    response::Json,
};
use crate::services::ai::router::ModelRouter;
use crate::config::Config;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelInfo {
    pub provider: String,
    pub model: String,
    pub available: bool,
    pub capabilities: ModelCapabilitiesInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelCapabilitiesInfo {
    pub supports_vision: bool,
    pub supports_function_calling: bool,
    pub max_context_length: u32,
    pub supports_streaming: bool,
    pub cost_per_1k_tokens: CostInfo,
    pub speed: String,
    pub quality: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CostInfo {
    pub input: f64,
    pub output: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelsResponse {
    pub models: Vec<ModelInfo>,
    pub total_available: usize,
    pub total_providers: usize,
}

pub async fn list_models(
    Extension(_config): Extension<Config>,
    Extension(router): Extension<Arc<ModelRouter>>,
) -> Result<Json<ModelsResponse>, StatusCode> {
    let mut models = Vec::new();
    
    // Check each provider
    let providers = vec![
        ("openai", "OpenAI", "gpt-4-turbo-preview"),
        ("anthropic", "Anthropic", "claude-3-5-sonnet-20241022"),
        ("google", "Google", "gemini-1.5-pro"),
        ("moonshot", "Moonshot", "kimi-k2.5"),
        ("deepseek", "DeepSeek", "deepseek-chat"),
        ("mistral", "Mistral", "mistral-large-latest"),
        ("cohere", "Cohere", "command-r-plus"),
        ("perplexity", "Perplexity", "llama-3.1-sonar-large-128k-online"),
        ("xai", "xAI", "grok-beta"),
        ("together", "Together", "meta-llama/Meta-Llama-3-70B-Instruct-Turbo"),
        ("anyscale", "Anyscale", "meta-llama/Meta-Llama-3.1-405B-Instruct"),
        ("qwen", "Qwen", "qwen-plus"),
        ("zeroone", "ZeroOne", "yi-1.5-34b-chat"),
        ("baidu", "Baidu", "ernie-4.0-8k"),
    ];
    
    for (provider_key, provider_name, default_model) in providers {
        let provider_enum = match provider_key {
            "openai" => crate::types::ModelProvider::OpenAI,
            "anthropic" => crate::types::ModelProvider::Anthropic,
            "google" => crate::types::ModelProvider::Google,
            "moonshot" => crate::types::ModelProvider::Moonshot,
            "deepseek" => crate::types::ModelProvider::DeepSeek,
            "mistral" => crate::types::ModelProvider::Mistral,
            "cohere" => crate::types::ModelProvider::Cohere,
            "perplexity" => crate::types::ModelProvider::Perplexity,
            "xai" => crate::types::ModelProvider::XAI,
            "together" => crate::types::ModelProvider::Together,
            "anyscale" => crate::types::ModelProvider::Anyscale,
            "qwen" => crate::types::ModelProvider::Qwen,
            "zeroone" => crate::types::ModelProvider::ZeroOne,
            "baidu" => crate::types::ModelProvider::Baidu,
            _ => continue,
        };
        
        let available = router.get_service(provider_enum.clone()).is_some();
        
        if let Some(service) = router.get_service(provider_enum) {
            let caps = service.capabilities();
            models.push(ModelInfo {
                provider: provider_name.to_string(),
                model: default_model.to_string(),
                available,
                capabilities: ModelCapabilitiesInfo {
                    supports_vision: caps.supports_vision,
                    supports_function_calling: caps.supports_function_calling,
                    max_context_length: caps.max_context_length,
                    supports_streaming: caps.supports_streaming,
                    cost_per_1k_tokens: CostInfo {
                        input: caps.cost_per_1k_tokens.input,
                        output: caps.cost_per_1k_tokens.output,
                    },
                    speed: format!("{:?}", caps.speed).to_lowercase(),
                    quality: format!("{:?}", caps.quality).to_lowercase(),
                },
            });
        } else {
            // Provider not configured, but still show it as unavailable
            models.push(ModelInfo {
                provider: provider_name.to_string(),
                model: default_model.to_string(),
                available: false,
                capabilities: ModelCapabilitiesInfo {
                    supports_vision: false,
                    supports_function_calling: false,
                    max_context_length: 0,
                    supports_streaming: false,
                    cost_per_1k_tokens: CostInfo {
                        input: 0.0,
                        output: 0.0,
                    },
                    speed: "unknown".to_string(),
                    quality: "unknown".to_string(),
                },
            });
        }
    }
    
    let total_available = models.iter().filter(|m| m.available).count();
    let total_providers = models.len();
    
    Ok(Json(ModelsResponse {
        models,
        total_available,
        total_providers,
    }))
}
