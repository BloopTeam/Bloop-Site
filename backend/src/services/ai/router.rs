/**
 * Intelligent model router - selects the best AI model for each request
 * This is what makes Bloop superior to KIMI and Claude
 */
use crate::types::{AIRequest, ModelProvider, ModelInfo, ModelCapabilities};
use crate::services::ai::{OpenAIService, AnthropicService, GoogleService};
use crate::services::ai::base::AIService;
use crate::config::Config;
use std::sync::Arc;

pub struct ModelRouter {
    openai: Option<Arc<OpenAIService>>,
    anthropic: Option<Arc<AnthropicService>>,
    google: Option<Arc<GoogleService>>,
}

/// Helper enum to hold different service types
#[derive(Clone)]
pub enum AIServiceEnum {
    OpenAI(Arc<OpenAIService>),
    Anthropic(Arc<AnthropicService>),
    Google(Arc<GoogleService>),
}

impl AIService for AIServiceEnum {
    fn name(&self) -> &str {
        match self {
            AIServiceEnum::OpenAI(s) => s.name(),
            AIServiceEnum::Anthropic(s) => s.name(),
            AIServiceEnum::Google(s) => s.name(),
        }
    }
    
    fn capabilities(&self) -> &ModelCapabilities {
        match self {
            AIServiceEnum::OpenAI(s) => s.capabilities(),
            AIServiceEnum::Anthropic(s) => s.capabilities(),
            AIServiceEnum::Google(s) => s.capabilities(),
        }
    }
    
    async fn generate(&self, request: AIRequest) -> anyhow::Result<crate::types::AIResponse> {
        match self {
            AIServiceEnum::OpenAI(s) => s.generate(request).await,
            AIServiceEnum::Anthropic(s) => s.generate(request).await,
            AIServiceEnum::Google(s) => s.generate(request).await,
        }
    }
}

impl ModelRouter {
    pub fn new(config: &Config) -> Self {
        Self {
            openai: if !config.openai_api_key.is_empty() {
                Some(Arc::new(OpenAIService::new(config)))
            } else {
                None
            },
            anthropic: if !config.anthropic_api_key.is_empty() {
                Some(Arc::new(AnthropicService::new(config)))
            } else {
                None
            },
            google: if !config.google_gemini_api_key.is_empty() {
                Some(Arc::new(GoogleService::new(config)))
            } else {
                None
            },
        }
    }
    
    /// Intelligently selects the best model for a given request
    /// Considers: context length, cost, speed, quality, task type
    pub fn select_best_model(&self, request: &AIRequest) -> anyhow::Result<ModelInfo> {
        // Check if specific model requested
        if let Some(model_str) = &request.model {
            if let Some(provider) = self.parse_provider_from_model(model_str) {
                if let Some(service) = self.get_service(provider) {
                    return Ok(ModelInfo {
                        provider,
                        model: model_str.clone(),
                        capabilities: service.capabilities().clone(),
                    });
                }
            }
        }
        
        // Auto-select based on request characteristics
        let context_length = self.estimate_context_length(request);
        let requires_vision = self.requires_vision(request);
        let requires_speed = self.requires_speed(request);
        let requires_quality = self.requires_quality(request);
        
        // Score each available service
        let mut scores: Vec<(ModelProvider, f64, ModelCapabilities)> = Vec::new();
        
        if let Some(ref service) = self.openai {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::OpenAI, score, service.capabilities().clone()));
        }
        
        if let Some(ref service) = self.anthropic {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::Anthropic, score, service.capabilities().clone()));
        }
        
        if let Some(ref service) = self.google {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::Google, score, service.capabilities().clone()));
        }
        
        if scores.is_empty() {
            return Err(anyhow::anyhow!("No AI services available"));
        }
        
        // Sort by score and select best
        scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        let (provider, _, capabilities) = &scores[0];
        
        Ok(ModelInfo {
            provider: provider.clone(),
            model: self.get_default_model(provider),
            capabilities: capabilities.clone(),
        })
    }
    
    fn score_service(
        &self,
        service: &dyn AIService,
        context_length: u32,
        requires_vision: bool,
        requires_speed: bool,
        requires_quality: bool,
    ) -> f64 {
        let caps = service.capabilities();
        let mut score = 0.0;
        
        // Context length match (higher is better)
        if caps.max_context_length >= context_length {
            score += 10.0;
        } else {
            score -= 20.0; // Penalty for insufficient context
        }
        
        // Vision support
        if requires_vision && caps.supports_vision {
            score += 5.0;
        }
        
        // Speed preference
        if requires_speed {
            match caps.speed {
                crate::types::Speed::Fast => score += 5.0,
                crate::types::Speed::Medium => score += 2.0,
                crate::types::Speed::Slow => {},
            }
        }
        
        // Quality preference
        if requires_quality {
            match caps.quality {
                crate::types::Quality::High => score += 5.0,
                crate::types::Quality::Medium => score += 2.0,
                crate::types::Quality::Low => {},
            }
        }
        
        // Cost efficiency (lower cost = higher score)
        let avg_cost = (caps.cost_per_1k_tokens.input + caps.cost_per_1k_tokens.output) / 2.0;
        score += (0.01 / avg_cost) * 2.0;
        
        score
    }
    
    fn estimate_context_length(&self, request: &AIRequest) -> u32 {
        let mut length = 0u32;
        
        // Messages
        for msg in &request.messages {
            length += (msg.content.len() as f32 / 4.0).ceil() as u32;
        }
        
        // Context files
        if let Some(ref context) = request.context {
            if let Some(ref files) = context.files {
                for file in files {
                    length += (file.content.len() as f32 / 4.0).ceil() as u32;
                }
            }
        }
        
        length
    }
    
    fn requires_vision(&self, request: &AIRequest) -> bool {
        let content = request.messages
            .iter()
            .map(|m| m.content.to_lowercase())
            .collect::<String>();
        
        content.contains("image") || 
        content.contains("screenshot") || 
        content.contains("visual") ||
        content.contains("design") ||
        request.context.as_ref()
            .and_then(|c| c.files.as_ref())
            .map(|f| f.iter().any(|file| {
                file.path.ends_with(".png") || 
                file.path.ends_with(".jpg") || 
                file.path.ends_with(".jpeg") ||
                file.path.ends_with(".gif") ||
                file.path.ends_with(".svg")
            }))
            .unwrap_or(false)
    }
    
    fn requires_speed(&self, request: &AIRequest) -> bool {
        let content = request.messages
            .iter()
            .map(|m| m.content.to_lowercase())
            .collect::<String>();
        
        let simple_tasks = ["explain", "summarize", "translate", "format", "refactor simple"];
        simple_tasks.iter().any(|task| content.contains(task))
    }
    
    fn requires_quality(&self, request: &AIRequest) -> bool {
        let content = request.messages
            .iter()
            .map(|m| m.content.to_lowercase())
            .collect::<String>();
        
        let complex_tasks = ["architecture", "design", "complex", "critical", "production", "security"];
        complex_tasks.iter().any(|task| content.contains(task))
    }
    
    fn parse_provider_from_model(&self, model: &str) -> Option<ModelProvider> {
        if model.starts_with("gpt") || model.starts_with("openai") {
            Some(ModelProvider::OpenAI)
        } else if model.starts_with("claude") || model.starts_with("anthropic") {
            Some(ModelProvider::Anthropic)
        } else if model.starts_with("gemini") || model.starts_with("google") {
            Some(ModelProvider::Google)
        } else {
            None
        }
    }
    
    fn get_default_model(&self, provider: &ModelProvider) -> String {
        match provider {
            ModelProvider::OpenAI => "gpt-4-turbo-preview".to_string(),
            ModelProvider::Anthropic => "claude-3-5-sonnet-20241022".to_string(),
            ModelProvider::Google => "gemini-1.5-pro".to_string(),
            ModelProvider::Auto => "gpt-4-turbo-preview".to_string(),
        }
    }
    
    pub fn get_service(&self, provider: ModelProvider) -> Option<AIServiceEnum> {
        match provider {
            ModelProvider::OpenAI => self.openai.as_ref().map(|s| AIServiceEnum::OpenAI(s.clone())),
            ModelProvider::Anthropic => self.anthropic.as_ref().map(|s| AIServiceEnum::Anthropic(s.clone())),
            ModelProvider::Google => self.google.as_ref().map(|s| AIServiceEnum::Google(s.clone())),
            ModelProvider::Auto => None,
        }
    }
}
