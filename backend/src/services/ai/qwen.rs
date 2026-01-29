/**
 * Alibaba Qwen service integration
 * Multilingual models with strong coding capabilities
 */
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use crate::types::{AIRequest, AIResponse, ModelCapabilities, TokenUsage, MessageRole};
use crate::services::ai::base::AIService;
use crate::config::Config;

pub struct QwenService {
    client: Client,
    api_key: String,
    capabilities: ModelCapabilities,
}

impl QwenService {
    pub fn new(config: &Config) -> Self {
        Self {
            client: Client::new(),
            api_key: config.qwen_api_key.clone(),
            capabilities: ModelCapabilities {
                supports_vision: true,
                supports_function_calling: true,
                max_context_length: 32000, // Qwen 2.5
                supports_streaming: true,
                cost_per_1k_tokens: crate::types::CostPer1kTokens {
                    input: 0.0002,
                    output: 0.0002,
                },
                speed: crate::types::Speed::Fast,
                quality: crate::types::Quality::High,
            },
        }
    }
}

#[async_trait]
impl AIService for QwenService {
    fn name(&self) -> &str {
        "qwen"
    }
    
    fn capabilities(&self) -> &ModelCapabilities {
        &self.capabilities
    }
    
    async fn generate(&self, request: AIRequest) -> anyhow::Result<AIResponse> {
        self.validate_request(&request)?;
        
        let model = request.model.as_deref().unwrap_or("qwen-plus");
        
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
            "input": {
                "messages": messages
            },
            "parameters": {
                "temperature": request.temperature.unwrap_or(0.7),
                "max_tokens": request.max_tokens.unwrap_or(4000),
            }
        });
        
        let response = self.client
            .post("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("Qwen API error: {}", error_text));
        }
        
        let json: serde_json::Value = response.json().await?;
        
        let output = json["output"].as_object()
            .ok_or_else(|| anyhow::anyhow!("Invalid response format"))?;
        
        let content = output["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No text in response"))?
            .to_string();
        
        let usage = json["usage"].as_object().map(|u| TokenUsage {
            prompt_tokens: u["input_tokens"].as_u64().unwrap_or(0) as u32,
            completion_tokens: u["output_tokens"].as_u64().unwrap_or(0) as u32,
            total_tokens: u["total_tokens"].as_u64().unwrap_or(0) as u32,
        });
        
        Ok(AIResponse {
            content,
            model: json["model"].as_str().unwrap_or(model).to_string(),
            usage,
            finish_reason: json["output"]["finish_reason"].as_str().map(|s| s.to_string()),
            metadata: Some({
                let mut meta = std::collections::HashMap::new();
                meta.insert("provider".to_string(), serde_json::Value::String("qwen".to_string()));
                meta.insert("specialization".to_string(), serde_json::Value::String("multilingual".to_string()));
                meta
            }),
        })
    }
}
