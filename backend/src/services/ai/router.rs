/**
 * Intelligent model router - selects the best AI model for each request
 * This is what makes Bloop superior to KIMI and Claude
 * Supports 15+ AI providers with intelligent selection
 */
use crate::types::{AIRequest, ModelProvider, ModelInfo, ModelCapabilities};
use crate::services::ai::{
    OpenAIService, AnthropicService, GoogleService, MoonshotService,
    DeepSeekService, MistralService, CohereService, PerplexityService,
    XAIService, TogetherService, AnyscaleService, QwenService,
    ZeroOneService, BaiduService
};
use crate::services::ai::base::AIService;
use crate::config::Config;
use std::sync::Arc;

pub struct ModelRouter {
    openai: Option<Arc<OpenAIService>>,
    anthropic: Option<Arc<AnthropicService>>,
    google: Option<Arc<GoogleService>>,
    moonshot: Option<Arc<MoonshotService>>,
    deepseek: Option<Arc<DeepSeekService>>,
    mistral: Option<Arc<MistralService>>,
    cohere: Option<Arc<CohereService>>,
    perplexity: Option<Arc<PerplexityService>>,
    xai: Option<Arc<XAIService>>,
    together: Option<Arc<TogetherService>>,
    anyscale: Option<Arc<AnyscaleService>>,
    qwen: Option<Arc<QwenService>>,
    zeroone: Option<Arc<ZeroOneService>>,
    baidu: Option<Arc<BaiduService>>,
}

/// Helper enum to hold different service types
#[derive(Clone)]
pub enum AIServiceEnum {
    OpenAI(Arc<OpenAIService>),
    Anthropic(Arc<AnthropicService>),
    Google(Arc<GoogleService>),
    Moonshot(Arc<MoonshotService>),
    DeepSeek(Arc<DeepSeekService>),
    Mistral(Arc<MistralService>),
    Cohere(Arc<CohereService>),
    Perplexity(Arc<PerplexityService>),
    XAI(Arc<XAIService>),
    Together(Arc<TogetherService>),
    Anyscale(Arc<AnyscaleService>),
    Qwen(Arc<QwenService>),
    ZeroOne(Arc<ZeroOneService>),
    Baidu(Arc<BaiduService>),
}

impl AIService for AIServiceEnum {
    fn name(&self) -> &str {
        match self {
            AIServiceEnum::OpenAI(s) => s.name(),
            AIServiceEnum::Anthropic(s) => s.name(),
            AIServiceEnum::Google(s) => s.name(),
            AIServiceEnum::Moonshot(s) => s.name(),
            AIServiceEnum::DeepSeek(s) => s.name(),
            AIServiceEnum::Mistral(s) => s.name(),
            AIServiceEnum::Cohere(s) => s.name(),
            AIServiceEnum::Perplexity(s) => s.name(),
            AIServiceEnum::XAI(s) => s.name(),
            AIServiceEnum::Together(s) => s.name(),
            AIServiceEnum::Anyscale(s) => s.name(),
            AIServiceEnum::Qwen(s) => s.name(),
            AIServiceEnum::ZeroOne(s) => s.name(),
            AIServiceEnum::Baidu(s) => s.name(),
        }
    }
    
    fn capabilities(&self) -> &ModelCapabilities {
        match self {
            AIServiceEnum::OpenAI(s) => s.capabilities(),
            AIServiceEnum::Anthropic(s) => s.capabilities(),
            AIServiceEnum::Google(s) => s.capabilities(),
            AIServiceEnum::Moonshot(s) => s.capabilities(),
            AIServiceEnum::DeepSeek(s) => s.capabilities(),
            AIServiceEnum::Mistral(s) => s.capabilities(),
            AIServiceEnum::Cohere(s) => s.capabilities(),
            AIServiceEnum::Perplexity(s) => s.capabilities(),
            AIServiceEnum::XAI(s) => s.capabilities(),
            AIServiceEnum::Together(s) => s.capabilities(),
            AIServiceEnum::Anyscale(s) => s.capabilities(),
            AIServiceEnum::Qwen(s) => s.capabilities(),
            AIServiceEnum::ZeroOne(s) => s.capabilities(),
            AIServiceEnum::Baidu(s) => s.capabilities(),
        }
    }
    
    async fn generate(&self, request: AIRequest) -> anyhow::Result<crate::types::AIResponse> {
        match self {
            AIServiceEnum::OpenAI(s) => s.generate(request).await,
            AIServiceEnum::Anthropic(s) => s.generate(request).await,
            AIServiceEnum::Google(s) => s.generate(request).await,
            AIServiceEnum::Moonshot(s) => s.generate(request).await,
            AIServiceEnum::DeepSeek(s) => s.generate(request).await,
            AIServiceEnum::Mistral(s) => s.generate(request).await,
            AIServiceEnum::Cohere(s) => s.generate(request).await,
            AIServiceEnum::Perplexity(s) => s.generate(request).await,
            AIServiceEnum::XAI(s) => s.generate(request).await,
            AIServiceEnum::Together(s) => s.generate(request).await,
            AIServiceEnum::Anyscale(s) => s.generate(request).await,
            AIServiceEnum::Qwen(s) => s.generate(request).await,
            AIServiceEnum::ZeroOne(s) => s.generate(request).await,
            AIServiceEnum::Baidu(s) => s.generate(request).await,
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
            moonshot: if !config.moonshot_api_key.is_empty() {
                Some(Arc::new(MoonshotService::new(config)))
            } else {
                None
            },
            deepseek: if !config.deepseek_api_key.is_empty() {
                Some(Arc::new(DeepSeekService::new(config)))
            } else {
                None
            },
            mistral: if !config.mistral_api_key.is_empty() {
                Some(Arc::new(MistralService::new(config)))
            } else {
                None
            },
            cohere: if !config.cohere_api_key.is_empty() {
                Some(Arc::new(CohereService::new(config)))
            } else {
                None
            },
            perplexity: if !config.perplexity_api_key.is_empty() {
                Some(Arc::new(PerplexityService::new(config)))
            } else {
                None
            },
            xai: if !config.xai_api_key.is_empty() {
                Some(Arc::new(XAIService::new(config)))
            } else {
                None
            },
            together: if !config.together_api_key.is_empty() {
                Some(Arc::new(TogetherService::new(config)))
            } else {
                None
            },
            anyscale: if !config.anyscale_api_key.is_empty() {
                Some(Arc::new(AnyscaleService::new(config)))
            } else {
                None
            },
            qwen: if !config.qwen_api_key.is_empty() {
                Some(Arc::new(QwenService::new(config)))
            } else {
                None
            },
            zeroone: if !config.zeroone_api_key.is_empty() {
                Some(Arc::new(ZeroOneService::new(config)))
            } else {
                None
            },
            baidu: if !config.baidu_api_key.is_empty() {
                Some(Arc::new(BaiduService::new(config)))
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
        
        if let Some(ref service) = self.moonshot {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::Moonshot, score, service.capabilities().clone()));
        }
        
        if let Some(ref service) = self.deepseek {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::DeepSeek, score, service.capabilities().clone()));
        }
        
        if let Some(ref service) = self.mistral {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::Mistral, score, service.capabilities().clone()));
        }
        
        if let Some(ref service) = self.cohere {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::Cohere, score, service.capabilities().clone()));
        }
        
        if let Some(ref service) = self.perplexity {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::Perplexity, score, service.capabilities().clone()));
        }
        
        if let Some(ref service) = self.xai {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::XAI, score, service.capabilities().clone()));
        }
        
        if let Some(ref service) = self.together {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::Together, score, service.capabilities().clone()));
        }
        
        if let Some(ref service) = self.anyscale {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::Anyscale, score, service.capabilities().clone()));
        }
        
        if let Some(ref service) = self.qwen {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::Qwen, score, service.capabilities().clone()));
        }
        
        if let Some(ref service) = self.zeroone {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::ZeroOne, score, service.capabilities().clone()));
        }
        
        if let Some(ref service) = self.baidu {
            let score = self.score_service(service.as_ref(), context_length, requires_vision, requires_speed, requires_quality);
            scores.push((ModelProvider::Baidu, score, service.capabilities().clone()));
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
        let model_lower = model.to_lowercase();
        if model_lower.starts_with("gpt") || model_lower.starts_with("openai") {
            Some(ModelProvider::OpenAI)
        } else if model_lower.starts_with("claude") || model_lower.starts_with("anthropic") {
            Some(ModelProvider::Anthropic)
        } else if model_lower.starts_with("gemini") || model_lower.starts_with("google") {
            Some(ModelProvider::Google)
        } else if model_lower.starts_with("kimi") || model_lower.starts_with("moonshot") {
            Some(ModelProvider::Moonshot)
        } else if model_lower.starts_with("deepseek") {
            Some(ModelProvider::DeepSeek)
        } else if model_lower.starts_with("mistral") {
            Some(ModelProvider::Mistral)
        } else if model_lower.starts_with("cohere") || model_lower.starts_with("command") {
            Some(ModelProvider::Cohere)
        } else if model_lower.starts_with("perplexity") || model_lower.starts_with("sonar") {
            Some(ModelProvider::Perplexity)
        } else if model_lower.starts_with("grok") || model_lower.starts_with("xai") {
            Some(ModelProvider::XAI)
        } else if model_lower.starts_with("together") || model_lower.contains("llama") || model_lower.contains("mixtral") {
            Some(ModelProvider::Together)
        } else if model_lower.starts_with("anyscale") {
            Some(ModelProvider::Anyscale)
        } else if model_lower.starts_with("qwen") {
            Some(ModelProvider::Qwen)
        } else if model_lower.starts_with("yi") || model_lower.starts_with("zeroone") {
            Some(ModelProvider::ZeroOne)
        } else if model_lower.starts_with("ernie") || model_lower.starts_with("baidu") {
            Some(ModelProvider::Baidu)
        } else {
            None
        }
    }
    
    fn get_default_model(&self, provider: &ModelProvider) -> String {
        match provider {
            ModelProvider::OpenAI => "gpt-4-turbo-preview".to_string(),
            ModelProvider::Anthropic => "claude-3-5-sonnet-20241022".to_string(),
            ModelProvider::Google => "gemini-1.5-pro".to_string(),
            ModelProvider::Moonshot => "kimi-k2.5".to_string(),
            ModelProvider::DeepSeek => "deepseek-chat".to_string(),
            ModelProvider::Mistral => "mistral-large-latest".to_string(),
            ModelProvider::Cohere => "command-r-plus".to_string(),
            ModelProvider::Perplexity => "llama-3.1-sonar-large-128k-online".to_string(),
            ModelProvider::XAI => "grok-beta".to_string(),
            ModelProvider::Together => "meta-llama/Meta-Llama-3-70B-Instruct-Turbo".to_string(),
            ModelProvider::Anyscale => "meta-llama/Meta-Llama-3.1-405B-Instruct".to_string(),
            ModelProvider::Qwen => "qwen-plus".to_string(),
            ModelProvider::ZeroOne => "yi-1.5-34b-chat".to_string(),
            ModelProvider::Baidu => "ernie-4.0-8k".to_string(),
            ModelProvider::Auto => "gpt-4-turbo-preview".to_string(),
        }
    }
    
    pub fn get_service(&self, provider: ModelProvider) -> Option<AIServiceEnum> {
        match provider {
            ModelProvider::OpenAI => self.openai.as_ref().map(|s| AIServiceEnum::OpenAI(s.clone())),
            ModelProvider::Anthropic => self.anthropic.as_ref().map(|s| AIServiceEnum::Anthropic(s.clone())),
            ModelProvider::Google => self.google.as_ref().map(|s| AIServiceEnum::Google(s.clone())),
            ModelProvider::Moonshot => self.moonshot.as_ref().map(|s| AIServiceEnum::Moonshot(s.clone())),
            ModelProvider::DeepSeek => self.deepseek.as_ref().map(|s| AIServiceEnum::DeepSeek(s.clone())),
            ModelProvider::Mistral => self.mistral.as_ref().map(|s| AIServiceEnum::Mistral(s.clone())),
            ModelProvider::Cohere => self.cohere.as_ref().map(|s| AIServiceEnum::Cohere(s.clone())),
            ModelProvider::Perplexity => self.perplexity.as_ref().map(|s| AIServiceEnum::Perplexity(s.clone())),
            ModelProvider::XAI => self.xai.as_ref().map(|s| AIServiceEnum::XAI(s.clone())),
            ModelProvider::Together => self.together.as_ref().map(|s| AIServiceEnum::Together(s.clone())),
            ModelProvider::Anyscale => self.anyscale.as_ref().map(|s| AIServiceEnum::Anyscale(s.clone())),
            ModelProvider::Qwen => self.qwen.as_ref().map(|s| AIServiceEnum::Qwen(s.clone())),
            ModelProvider::ZeroOne => self.zeroone.as_ref().map(|s| AIServiceEnum::ZeroOne(s.clone())),
            ModelProvider::Baidu => self.baidu.as_ref().map(|s| AIServiceEnum::Baidu(s.clone())),
            ModelProvider::Auto => None,
        }
    }
}
