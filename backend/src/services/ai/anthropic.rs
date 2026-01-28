/**
 * Anthropic Claude service integration
 */
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use crate::types::{AIRequest, AIResponse, ModelCapabilities, TokenUsage, MessageRole};
use crate::services::ai::base::AIService;
use crate::config::Config;

pub struct AnthropicService {
    client: Client,
    api_key: String,
    capabilities: ModelCapabilities,
}

impl AnthropicService {
    pub fn new(config: &Config) -> Self {
        Self {
            client: Client::new(),
            api_key: config.anthropic_api_key.clone(),
            capabilities: ModelCapabilities {
                supports_vision: true,
                supports_function_calling: true,
                max_context_length: 200000, // Claude 3.5 Sonnet
                supports_streaming: true,
                cost_per_1k_tokens: crate::types::CostPer1kTokens {
                    input: 0.003,
                    output: 0.015,
                },
                speed: crate::types::Speed::Fast,
                quality: crate::types::Quality::High,
            },
        }
    }
}

#[async_trait]
impl AIService for AnthropicService {
    fn name(&self) -> &str {
        "anthropic"
    }
    
    fn capabilities(&self) -> &ModelCapabilities {
        &self.capabilities
    }
    
    async fn generate(&self, request: AIRequest) -> anyhow::Result<AIResponse> {
        self.validate_request(&request)?;
        
        let model = request.model.as_deref().unwrap_or("claude-3-5-sonnet-20241022");
        
        // Separate system message from conversation
        let system_message = request.messages
            .iter()
            .find(|m| matches!(m.role, MessageRole::System))
            .map(|m| m.content.clone());
        
        let messages: Vec<serde_json::Value> = request.messages
            .iter()
            .filter(|m| !matches!(m.role, MessageRole::System))
            .map(|msg| {
                json!({
                    "role": match msg.role {
                        MessageRole::User => "user",
                        MessageRole::Assistant => "assistant",
                        MessageRole::System => unreachable!(),
                    },
                    "content": msg.content
                })
            })
            .collect();
        
        let mut body = json!({
            "model": model,
            "max_tokens": request.max_tokens.unwrap_or(4096),
            "temperature": request.temperature.unwrap_or(0.7),
            "messages": messages,
        });
        
        if let Some(system) = system_message {
            body["system"] = json!(system);
        }
        
        let response = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("Anthropic API error: {}", error_text));
        }
        
        let json: serde_json::Value = response.json().await?;
        
        let content_block = json["content"][0].as_object()
            .ok_or_else(|| anyhow::anyhow!("Invalid response format"))?;
        
        let content = content_block["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No text in response"))?
            .to_string();
        
        let usage = json["usage"].as_object().map(|u| TokenUsage {
            prompt_tokens: u["input_tokens"].as_u64().unwrap_or(0) as u32,
            completion_tokens: u["output_tokens"].as_u64().unwrap_or(0) as u32,
            total_tokens: u["input_tokens"].as_u64().unwrap_or(0) as u32 + 
                         u["output_tokens"].as_u64().unwrap_or(0) as u32,
        });
        
        Ok(AIResponse {
            content,
            model: json["model"].as_str().unwrap_or(model).to_string(),
            usage,
            finish_reason: json["stop_reason"].as_str().map(|s| s.to_string()),
            metadata: Some({
                let mut meta = std::collections::HashMap::new();
                meta.insert("provider".to_string(), serde_json::Value::String("anthropic".to_string()));
                meta
            }),
        })
    }
}
