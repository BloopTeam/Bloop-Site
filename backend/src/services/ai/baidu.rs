/**
 * Baidu Ernie service integration
 * Chinese-focused models with strong capabilities
 */
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use crate::types::{AIRequest, AIResponse, ModelCapabilities, TokenUsage, MessageRole};
use crate::services::ai::base::AIService;
use crate::config::Config;

pub struct BaiduService {
    client: Client,
    api_key: String,
    capabilities: ModelCapabilities,
}

impl BaiduService {
    pub fn new(config: &Config) -> Self {
        Self {
            client: Client::new(),
            api_key: config.baidu_api_key.clone(),
            capabilities: ModelCapabilities {
                supports_vision: true,
                supports_function_calling: true,
                max_context_length: 128000, // Ernie 4.0
                supports_streaming: true,
                cost_per_1k_tokens: crate::types::CostPer1kTokens {
                    input: 0.0008,
                    output: 0.0008,
                },
                speed: crate::types::Speed::Medium,
                quality: crate::types::Quality::High,
            },
        }
    }
}

#[async_trait]
impl AIService for BaiduService {
    fn name(&self) -> &str {
        "baidu"
    }
    
    fn capabilities(&self) -> &ModelCapabilities {
        &self.capabilities
    }
    
    async fn generate(&self, request: AIRequest) -> anyhow::Result<AIResponse> {
        self.validate_request(&request)?;
        
        let model = request.model.as_deref().unwrap_or("ernie-4.0-8k");
        
        // Baidu uses a different format
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
            "max_output_tokens": request.max_tokens.unwrap_or(4000),
        });
        
        let response = self.client
            .post("https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("Baidu API error: {}", error_text));
        }
        
        let json: serde_json::Value = response.json().await?;
        
        let result = json["result"].as_str()
            .ok_or_else(|| anyhow::anyhow!("No result in response"))?
            .to_string();
        
        let usage = json["usage"].as_object().map(|u| TokenUsage {
            prompt_tokens: u["prompt_tokens"].as_u64().unwrap_or(0) as u32,
            completion_tokens: u["completion_tokens"].as_u64().unwrap_or(0) as u32,
            total_tokens: u["total_tokens"].as_u64().unwrap_or(0) as u32,
        });
        
        Ok(AIResponse {
            content: result,
            model: json["model"].as_str().unwrap_or(model).to_string(),
            usage,
            finish_reason: json["finish_reason"].as_str().map(|s| s.to_string()),
            metadata: Some({
                let mut meta = std::collections::HashMap::new();
                meta.insert("provider".to_string(), serde_json::Value::String("baidu".to_string()));
                meta.insert("specialization".to_string(), serde_json::Value::String("chinese".to_string()));
                meta
            }),
        })
    }
}
