/**
 * Moonshot AI (Kimi K2.5) service integration
 * Supports Kimi K2.5 - 1T parameter multimodal MoE model with 256K context
 */
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use crate::types::{AIRequest, AIResponse, ModelCapabilities, TokenUsage, MessageRole};
use crate::services::ai::base::AIService;
use crate::config::Config;

pub struct MoonshotService {
    client: Client,
    api_key: String,
    capabilities: ModelCapabilities,
}

impl MoonshotService {
    pub fn new(config: &Config) -> Self {
        Self {
            client: Client::new(),
            api_key: config.moonshot_api_key.clone(),
            capabilities: ModelCapabilities {
                supports_vision: true,
                supports_function_calling: true,
                max_context_length: 256000, // Kimi K2.5 - 256K context
                supports_streaming: true,
                cost_per_1k_tokens: crate::types::CostPer1kTokens {
                    input: 0.0008,
                    output: 0.002,
                },
                speed: crate::types::Speed::Fast,
                quality: crate::types::Quality::High,
            },
        }
    }
}

#[async_trait]
impl AIService for MoonshotService {
    fn name(&self) -> &str {
        "moonshot"
    }
    
    fn capabilities(&self) -> &ModelCapabilities {
        &self.capabilities
    }
    
    async fn generate(&self, request: AIRequest) -> anyhow::Result<AIResponse> {
        self.validate_request(&request)?;
        
        let model = request.model.as_deref().unwrap_or("kimi-k2.5");
        
        // Convert messages to OpenAI-compatible format (Moonshot uses OpenAI format)
        let messages: Vec<serde_json::Value> = request.messages
            .iter()
            .map(|msg| {
                json!({
                    "role": match msg.role {
                        MessageRole::User => "user",
                        MessageRole::Assistant => "assistant",
                        MessageRole::System => "system",
                    },
                    "content": msg.content
                })
            })
            .collect();
        
        let body = json!({
            "model": model,
            "messages": messages,
            "temperature": request.temperature.unwrap_or(0.7),
            "max_tokens": request.max_tokens.unwrap_or(4000),
        });
        
        let response = self.client
            .post("https://api.moonshot.cn/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("Moonshot API error: {}", error_text));
        }
        
        let json: serde_json::Value = response.json().await?;
        
        let choice = json["choices"][0].as_object()
            .ok_or_else(|| anyhow::anyhow!("Invalid response format"))?;
        
        let message = choice["message"].as_object()
            .ok_or_else(|| anyhow::anyhow!("Invalid message format"))?;
        
        let content = message["content"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No content in response"))?
            .to_string();
        
        let usage = json["usage"].as_object().map(|u| TokenUsage {
            prompt_tokens: u["prompt_tokens"].as_u64().unwrap_or(0) as u32,
            completion_tokens: u["completion_tokens"].as_u64().unwrap_or(0) as u32,
            total_tokens: u["total_tokens"].as_u64().unwrap_or(0) as u32,
        });
        
        Ok(AIResponse {
            content,
            model: json["model"].as_str().unwrap_or(model).to_string(),
            usage,
            finish_reason: choice["finish_reason"].as_str().map(|s| s.to_string()),
            metadata: Some({
                let mut meta = std::collections::HashMap::new();
                meta.insert("provider".to_string(), serde_json::Value::String("moonshot".to_string()));
                meta.insert("model_type".to_string(), serde_json::Value::String("kimi-k2.5".to_string()));
                meta
            }),
        })
    }
}
