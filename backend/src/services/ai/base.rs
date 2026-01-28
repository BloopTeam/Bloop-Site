/**
 * Base AI service trait
 */
use async_trait::async_trait;
use crate::types::{AIRequest, AIResponse, ModelCapabilities};

#[async_trait]
pub trait AIService: Send + Sync {
    fn name(&self) -> &str;
    fn capabilities(&self) -> &ModelCapabilities;
    
    async fn generate(&self, request: AIRequest) -> anyhow::Result<AIResponse>;
    
    fn estimate_tokens(&self, text: &str) -> u32 {
        // Rough estimation: ~4 characters per token
        (text.len() as f32 / 4.0).ceil() as u32
    }
    
    fn validate_request(&self, request: &AIRequest) -> anyhow::Result<()> {
        if request.messages.is_empty() {
            return Err(anyhow::anyhow!("Messages array cannot be empty"));
        }
        
        let total_length: u32 = request.messages
            .iter()
            .map(|msg| self.estimate_tokens(&msg.content))
            .sum();
        
        if total_length > self.capabilities().max_context_length {
            return Err(anyhow::anyhow!(
                "Request exceeds maximum context length of {} tokens",
                self.capabilities().max_context_length
            ));
        }
        
        Ok(())
    }
}
