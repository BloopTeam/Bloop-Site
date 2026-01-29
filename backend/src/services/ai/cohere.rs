/**
 * Cohere service integration
 * Enterprise-grade models with excellent instruction following
 */
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use crate::types::{AIRequest, AIResponse, ModelCapabilities, TokenUsage, MessageRole};
use crate::services::ai::base::AIService;
use crate::config::Config;

pub struct CohereService {
    client: Client,
    api_key: String,
    capabilities: ModelCapabilities,
}

impl CohereService {
    pub fn new(config: &Config) -> Self {
        Self {
            client: Client::new(),
            api_key: config.cohere_api_key.clone(),
            capabilities: ModelCapabilities {
                supports_vision: false,
                supports_function_calling: true,
                max_context_length: 4096, // Command R+
                supports_streaming: true,
                cost_per_1k_tokens: crate::types::CostPer1kTokens {
                    input: 0.001,
                    output: 0.001,
                },
                speed: crate::types::Speed::Fast,
                quality: crate::types::Quality::Medium,
            },
        }
    }
}

#[async_trait]
impl AIService for CohereService {
    fn name(&self) -> &str {
        "cohere"
    }
    
    fn capabilities(&self) -> &ModelCapabilities {
        &self.capabilities
    }
    
    async fn generate(&self, request: AIRequest) -> anyhow::Result<AIResponse> {
        self.validate_request(&request)?;
        
        let model = request.model.as_deref().unwrap_or("command-r-plus");
        
        // Cohere uses a different format - convert messages to chat format
        let chat_history: Vec<serde_json::Value> = request.messages
            .iter()
            .filter(|m| !matches!(m.role, MessageRole::System))
            .map(|msg| {
                json!({
                    "role": match msg.role {
                        MessageRole::User => "USER",
                        MessageRole::Assistant => "CHATBOT",
                        MessageRole::System => unreachable!(),
                    },
                    "message": msg.content
                })
            })
            .collect();
        
        let system_message = request.messages
            .iter()
            .find(|m| matches!(m.role, MessageRole::System))
            .map(|m| m.content.clone());
        
        let mut body = json!({
            "model": model,
            "chat_history": chat_history,
            "message": request.messages.last().map(|m| m.content.clone()).unwrap_or_default(),
            "temperature": request.temperature.unwrap_or(0.7),
            "max_tokens": request.max_tokens.unwrap_or(4000),
        });
        
        if let Some(system) = system_message {
            body["preamble"] = json!(system);
        }
        
        let response = self.client
            .post("https://api.cohere.ai/v1/chat")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("Cohere API error: {}", error_text));
        }
        
        let json: serde_json::Value = response.json().await?;
        
        let content = json["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No text in response"))?
            .to_string();
        
        let usage = json["meta"].as_object()
            .and_then(|m| m["tokens"].as_object())
            .map(|t| TokenUsage {
                prompt_tokens: t["input_tokens"].as_u64().unwrap_or(0) as u32,
                completion_tokens: t["output_tokens"].as_u64().unwrap_or(0) as u32,
                total_tokens: t["input_tokens"].as_u64().unwrap_or(0) as u32 + 
                             t["output_tokens"].as_u64().unwrap_or(0) as u32,
            });
        
        Ok(AIResponse {
            content,
            model: json["generation_id"].as_str().unwrap_or(model).to_string(),
            usage,
            finish_reason: json["finish_reason"].as_str().map(|s| s.to_string()),
            metadata: Some({
                let mut meta = std::collections::HashMap::new();
                meta.insert("provider".to_string(), serde_json::Value::String("cohere".to_string()));
                meta.insert("specialization".to_string(), serde_json::Value::String("enterprise".to_string()));
                meta
            }),
        })
    }
}
