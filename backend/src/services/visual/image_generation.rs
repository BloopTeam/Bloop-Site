/**
 * Image Generation Service
 * 
 * Integrates with DALL-E, Stable Diffusion, and other image generation APIs
 */
use std::sync::Arc;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use crate::config::Config;
use crate::services::ai::router::ModelRouter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenerationRequest {
    pub prompt: String,
    pub model: ImageModel,
    pub size: ImageSize,
    pub quality: ImageQuality,
    pub style: Option<ImageStyle>,
    pub n: Option<u8>, // Number of images
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImageModel {
    DallE3,
    DallE2,
    StableDiffusionXL,
    Midjourney, // Via API if available
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImageSize {
    Square1024,   // 1024x1024
    Portrait1792, // 1024x1792
    Landscape1792, // 1792x1024
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImageQuality {
    Standard,
    HD,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImageStyle {
    Vivid,
    Natural,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenerationResponse {
    pub image_url: String,
    pub revised_prompt: Option<String>,
    pub model: String,
    pub size: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub struct ImageGenerationService {
    client: Client,
    config: Arc<Config>,
    router: Arc<ModelRouter>,
}

impl ImageGenerationService {
    pub fn new(config: Arc<Config>, router: Arc<ModelRouter>) -> Self {
        Self {
            client: Client::new(),
            config,
            router,
        }
    }

    /// Generate image using DALL-E 3
    pub async fn generate_with_dalle3(
        &self,
        request: ImageGenerationRequest,
    ) -> anyhow::Result<ImageGenerationResponse> {
        if self.config.openai_api_key.is_empty() {
            anyhow::bail!("OpenAI API key not configured");
        }

        let size_str = match request.size {
            ImageSize::Square1024 => "1024x1024",
            ImageSize::Portrait1792 => "1024x1792",
            ImageSize::Landscape1792 => "1792x1024",
        };

        let quality_str = match request.quality {
            ImageQuality::Standard => "standard",
            ImageQuality::HD => "hd",
        };

        let style_str = request.style
            .map(|s| match s {
                ImageStyle::Vivid => "vivid",
                ImageStyle::Natural => "natural",
            })
            .unwrap_or("vivid");

        let response = self.client
            .post("https://api.openai.com/v1/images/generations")
            .header("Authorization", format!("Bearer {}", self.config.openai_api_key))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "model": "dall-e-3",
                "prompt": request.prompt,
                "size": size_str,
                "quality": quality_str,
                "style": style_str,
                "n": request.n.unwrap_or(1)
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("DALL-E API error: {}", error_text);
        }

        let json: serde_json::Value = response.json().await?;
        
        // Extract image URL from response
        let image_url = json["data"][0]["url"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No image URL in response"))?
            .to_string();

        let revised_prompt = json["data"][0]["revised_prompt"]
            .as_str()
            .map(|s| s.to_string());

        Ok(ImageGenerationResponse {
            image_url,
            revised_prompt,
            model: "dall-e-3".to_string(),
            size: size_str.to_string(),
            created_at: chrono::Utc::now(),
        })
    }

    /// Generate image using Stable Diffusion (via Replicate or similar)
    pub async fn generate_with_stable_diffusion(
        &self,
        request: ImageGenerationRequest,
    ) -> anyhow::Result<ImageGenerationResponse> {
        // In production, integrate with Stable Diffusion API (Replicate, Stability AI, etc.)
        // For now, return a placeholder
        tracing::warn!("Stable Diffusion integration not yet implemented");
        
        Ok(ImageGenerationResponse {
            image_url: format!("https://placeholder.stable-diffusion/{}.png", uuid::Uuid::new_v4()),
            revised_prompt: Some(request.prompt.clone()),
            model: "stable-diffusion-xl".to_string(),
            size: "1024x1024".to_string(),
            created_at: chrono::Utc::now(),
        })
    }

    /// Generate image - auto-selects best model
    pub async fn generate(
        &self,
        request: ImageGenerationRequest,
    ) -> anyhow::Result<ImageGenerationResponse> {
        match request.model {
            ImageModel::DallE3 => self.generate_with_dalle3(request).await,
            ImageModel::DallE2 => {
                // Similar to DALL-E 3 but with different endpoint
                self.generate_with_dalle3(request).await
            }
            ImageModel::StableDiffusionXL => {
                self.generate_with_stable_diffusion(request).await
            }
            ImageModel::Midjourney => {
                // Midjourney API integration (if available)
                tracing::warn!("Midjourney integration not yet implemented");
                self.generate_with_dalle3(request).await
            }
        }
    }
}
