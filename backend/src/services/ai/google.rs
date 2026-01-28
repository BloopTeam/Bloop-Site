/**
 * Google Gemini service integration
 */
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use crate::types::{AIRequest, AIResponse, ModelCapabilities, TokenUsage, MessageRole};
use crate::services::ai::base::AIService;
use crate::config::Config;

pub struct GoogleService {
    client: Client,
    api_key: String,
    capabilities: ModelCapabilities,
}

impl GoogleService {
    pub fn new(config: &Config) -> Self {
        Self {
            client: Client::new(),
            api_key: config.google_gemini_api_key.clone(),
            capabilities: ModelCapabilities {
                supports_vision: true,
                supports_function_calling: true,
                max_context_length: 1000000, // Gemini 1.5 Pro
                supports_streaming: true,
                cost_per_1k_tokens: crate::types::CostPer1kTokens {
                    input: 0.00125,
                    output: 0.005,
                },
                speed: crate::types::Speed::Fast,
                quality: crate::types::Quality::High,
            },
        }
    }
}

#[async_trait]
impl AIService for GoogleService {
    fn name(&self) -> &str {
        "google"
    }
    
    fn capabilities(&self) -> &ModelCapabilities {
        &self.capabilities
    }
    
    async fn generate(&self, request: AIRequest) -> anyhow::Result<AIResponse> {
        self.validate_request(&request)?;
        
        let model = request.model.as_deref().unwrap_or("gemini-1.5-pro");
        
        // Build prompt from messages
        let system_message = request.messages
            .iter()
            .find(|m| matches!(m.role, MessageRole::System))
            .map(|m| m.content.clone());
        
        let mut prompt = String::new();
        if let Some(system) = system_message {
            prompt.push_str(&format!("System: {}\n\n", system));
        }
        
        for msg in request.messages.iter().filter(|m| !matches!(m.role, MessageRole::System)) {
            let role = match msg.role {
                MessageRole::User => "User",
                MessageRole::Assistant => "Assistant",
                MessageRole::System => unreachable!(),
            };
            prompt.push_str(&format!("{}: {}\n\n", role, msg.content));
        }
        prompt.push_str("Assistant:");
        
        let body = json!({
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": request.temperature.unwrap_or(0.7),
                "maxOutputTokens": request.max_tokens.unwrap_or(4096),
            }
        });
        
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model, self.api_key
        );
        
        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("Google Gemini API error: {}", error_text));
        }
        
        let json: serde_json::Value = response.json().await?;
        
        let candidate = json["candidates"][0].as_object()
            .ok_or_else(|| anyhow::anyhow!("Invalid response format"))?;
        
        let content = candidate["content"]["parts"][0]["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No text in response"))?
            .to_string();
        
        let usage = json["usageMetadata"].as_object().map(|u| TokenUsage {
            prompt_tokens: u["promptTokenCount"].as_u64().unwrap_or(0) as u32,
            completion_tokens: u["candidatesTokenCount"].as_u64().unwrap_or(0) as u32,
            total_tokens: u["totalTokenCount"].as_u64().unwrap_or(0) as u32,
        });
        
        Ok(AIResponse {
            content,
            model: model.to_string(),
            usage,
            finish_reason: candidate["finishReason"].as_str().map(|s| s.to_string()),
            metadata: Some({
                let mut meta = std::collections::HashMap::new();
                meta.insert("provider".to_string(), serde_json::Value::String("google".to_string()));
                meta
            }),
        })
    }
}
