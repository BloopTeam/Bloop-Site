/**
 * Visual Creative Engine
 * 
 * Handles visual creative tasks: image generation, UI mockups, etc.
 */
use std::sync::Arc;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;

use crate::services::ai::router::ModelRouter;
use crate::services::visual::{ImageGenerationService, AssetStorage, FigmaIntegration};
use crate::config::Config;
use super::types::{VisualCreativeRequest, VisualCreativeType, VisualCreativeStatus, VisualCreativeResult, Priority};

pub struct VisualCreativeEngine {
    router: Arc<ModelRouter>,
    config: Arc<Config>,
    image_service: Arc<ImageGenerationService>,
    asset_storage: Arc<AssetStorage>,
    figma: Arc<FigmaIntegration>,
    requests: Arc<tokio::sync::RwLock<HashMap<String, VisualCreativeRequest>>>,
}

impl VisualCreativeEngine {
    pub fn new(
        router: Arc<ModelRouter>,
        config: Arc<Config>,
        database: Option<Arc<crate::database::Database>>,
    ) -> Self {
        let image_service = Arc::new(ImageGenerationService::new(
            Arc::clone(&config),
            Arc::clone(&router),
        ));
        let asset_storage = Arc::new(AssetStorage::new(database));
        let figma = Arc::new(FigmaIntegration::new(Arc::clone(&config)));

        Self {
            router,
            config,
            image_service,
            asset_storage,
            figma,
            requests: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }

    /// Create a visual creative request
    pub async fn create_request(
        &self,
        request_type: VisualCreativeType,
        description: String,
        requirements: HashMap<String, serde_json::Value>,
        priority: Priority,
    ) -> String {
        let request_id = Uuid::new_v4().to_string();
        
        let request = VisualCreativeRequest {
            id: request_id.clone(),
            request_type,
            description,
            requirements,
            priority,
            assigned_agent: None,
            status: VisualCreativeStatus::Pending,
            created_at: Utc::now(),
            completed_at: None,
            result: None,
        };

        let mut requests = self.requests.write().await;
        requests.insert(request_id.clone(), request);
        drop(requests);

        // Process request asynchronously
        let engine = Arc::new(self.clone());
        let request_id_clone = request_id.clone();
        tokio::spawn(async move {
            engine.process_request(&request_id_clone).await;
        });

        request_id
    }

    /// Process a visual creative request
    async fn process_request(&self, request_id: &str) {
        let mut requests = self.requests.write().await;
        let request = match requests.get_mut(request_id) {
            Some(req) => {
                req.status = VisualCreativeStatus::InProgress;
                req.clone()
            }
            None => {
                tracing::error!("Visual creative request not found: {}", request_id);
                return;
            }
        };
        drop(requests);

        tracing::info!("Processing visual creative request: {} ({:?})", request_id, request.request_type);

        // Generate visual asset based on type
        let result = match request.request_type {
            VisualCreativeType::ImageGeneration => {
                self.generate_image(&request.description, &request.requirements).await
            }
            VisualCreativeType::UiMockup => {
                self.generate_ui_mockup(&request.description, &request.requirements).await
            }
            VisualCreativeType::IconDesign => {
                self.generate_icon(&request.description, &request.requirements).await
            }
            VisualCreativeType::LogoDesign => {
                self.generate_logo(&request.description, &request.requirements).await
            }
            VisualCreativeType::Illustration => {
                self.generate_illustration(&request.description, &request.requirements).await
            }
            VisualCreativeType::BannerDesign => {
                self.generate_banner(&request.description, &request.requirements).await
            }
            VisualCreativeType::AssetOptimization => {
                self.optimize_asset(&request.description, &request.requirements).await
            }
        };

        // Update request with result
        let mut requests = self.requests.write().await;
        if let Some(req) = requests.get_mut(request_id) {
            match result {
                Ok(creative_result) => {
                    req.status = VisualCreativeStatus::Completed;
                    req.completed_at = Some(Utc::now());
                    req.result = Some(creative_result);
                }
                Err(e) => {
                    req.status = VisualCreativeStatus::Failed;
                    tracing::error!("Visual creative request failed: {}", e);
                }
            }
        }
    }

    /// Generate an image using AI
    async fn generate_image(
        &self,
        description: &str,
        requirements: &HashMap<String, serde_json::Value>,
    ) -> anyhow::Result<VisualCreativeResult> {
        let start_time = std::time::Instant::now();

        // Enhance prompt using AI router
        let enhanced_prompt = self.enhance_prompt(description).await?;

        // Determine model from requirements or default to DALL-E 3
        let model = requirements
            .get("model")
            .and_then(|v| v.as_str())
            .map(|m| match m {
                "dall-e-2" => crate::services::visual::image_generation::ImageModel::DallE2,
                "stable-diffusion" => crate::services::visual::image_generation::ImageModel::StableDiffusionXL,
                _ => crate::services::visual::image_generation::ImageModel::DallE3,
            })
            .unwrap_or(crate::services::visual::image_generation::ImageModel::DallE3);

        // Determine size
        let size = requirements
            .get("size")
            .and_then(|v| v.as_str())
            .map(|s| match s {
                "portrait" => crate::services::visual::image_generation::ImageSize::Portrait1792,
                "landscape" => crate::services::visual::image_generation::ImageSize::Landscape1792,
                _ => crate::services::visual::image_generation::ImageSize::Square1024,
            })
            .unwrap_or(crate::services::visual::image_generation::ImageSize::Square1024);

        // Generate image using actual API
        let image_request = crate::services::visual::image_generation::ImageGenerationRequest {
            prompt: enhanced_prompt.clone(),
            model,
            size,
            quality: crate::services::visual::image_generation::ImageQuality::HD,
            style: Some(crate::services::visual::image_generation::ImageStyle::Vivid),
            n: Some(1),
        };

        let image_response = self.image_service.generate(image_request).await?;

        // Store asset
        let asset_id = self.asset_storage.store_asset(
            image_response.image_url.clone(),
            "image".to_string(),
            description.to_string(),
            HashMap::from([
                ("prompt".to_string(), serde_json::json!(enhanced_prompt)),
                ("model".to_string(), serde_json::json!(image_response.model)),
                ("revised_prompt".to_string(), serde_json::json!(image_response.revised_prompt)),
            ]),
        ).await;

        let duration_ms = start_time.elapsed().as_millis() as u64;

        Ok(VisualCreativeResult {
            asset_url: image_response.image_url,
            asset_type: "image".to_string(),
            metadata: HashMap::from([
                ("asset_id".to_string(), serde_json::json!(asset_id)),
                ("model".to_string(), serde_json::json!(image_response.model)),
                ("size".to_string(), serde_json::json!(image_response.size)),
            ]),
            generation_time_ms: duration_ms,
        })
    }

    /// Enhance prompt using AI
    async fn enhance_prompt(&self, description: &str) -> anyhow::Result<String> {
        // Use AI router to enhance the prompt for better image generation
        use crate::types::{AIMessage, MessageRole};
        let messages = vec![AIMessage {
            role: MessageRole::User,
            content: format!(
                "Create a detailed, vivid image generation prompt for: {}",
                description
            ),
            timestamp: Some(chrono::Utc::now()),
            metadata: None,
        }];

        use crate::types::AIRequest;
        let request = AIRequest {
            messages,
            model: Some("gpt-4-turbo-preview".to_string()), // Use GPT-4 for prompt enhancement
            temperature: Some(0.7),
            max_tokens: Some(200),
            stream: None,
            context: None,
        };

        match self.router.select_best_model(&request) {
            Ok(model_info) => {
                if let Some(service) = self.router.get_service(model_info.provider) {
                    match service.generate(request).await {
                        Ok(response) => Ok(response.content),
                        Err(e) => {
                            tracing::warn!("Failed to enhance prompt: {}", e);
                            Ok(description.to_string()) // Fallback to original
                        }
                    }
                } else {
                    Ok(description.to_string())
                }
            }
            Err(_) => Ok(description.to_string()),
        }
    }

    /// Generate UI mockup
    async fn generate_ui_mockup(
        &self,
        description: &str,
        requirements: &HashMap<String, serde_json::Value>,
    ) -> anyhow::Result<VisualCreativeResult> {
        let start_time = std::time::Instant::now();

        // Create mockup in Figma
        match self.figma.create_mockup(description, requirements).await {
            Ok(figma_url) => {
                // Export as image
                let export_url = self.figma.export_mockup(&figma_url, None).await?;

                // Store asset
                let asset_id = self.asset_storage.store_asset(
                    export_url.clone(),
                    "ui_mockup".to_string(),
                    description.to_string(),
                    HashMap::from([
                        ("figma_url".to_string(), serde_json::json!(figma_url)),
                    ]),
                ).await;

                let duration_ms = start_time.elapsed().as_millis() as u64;

                Ok(VisualCreativeResult {
                    asset_url: export_url,
                    asset_type: "ui_mockup".to_string(),
                    metadata: HashMap::from([
                        ("asset_id".to_string(), serde_json::json!(asset_id)),
                        ("figma_url".to_string(), serde_json::json!(figma_url)),
                    ]),
                    generation_time_ms: duration_ms,
                })
            }
            Err(e) => {
                // Fallback: Generate as image instead
                tracing::warn!("Figma integration failed: {}, falling back to image generation", e);
                self.generate_image(description, requirements).await
            }
        }
    }

    /// Generate icon
    async fn generate_icon(
        &self,
        description: &str,
        _requirements: &HashMap<String, serde_json::Value>,
    ) -> anyhow::Result<VisualCreativeResult> {
        self.generate_image(description, &HashMap::new()).await
    }

    /// Generate logo
    async fn generate_logo(
        &self,
        description: &str,
        _requirements: &HashMap<String, serde_json::Value>,
    ) -> anyhow::Result<VisualCreativeResult> {
        self.generate_image(description, &HashMap::new()).await
    }

    /// Generate illustration
    async fn generate_illustration(
        &self,
        description: &str,
        _requirements: &HashMap<String, serde_json::Value>,
    ) -> anyhow::Result<VisualCreativeResult> {
        self.generate_image(description, &HashMap::new()).await
    }

    /// Generate banner
    async fn generate_banner(
        &self,
        description: &str,
        _requirements: &HashMap<String, serde_json::Value>,
    ) -> anyhow::Result<VisualCreativeResult> {
        self.generate_image(description, &HashMap::new()).await
    }

    /// Optimize asset
    async fn optimize_asset(
        &self,
        description: &str,
        _requirements: &HashMap<String, serde_json::Value>,
    ) -> anyhow::Result<VisualCreativeResult> {
        let start_time = std::time::Instant::now();
        let asset_url = format!("optimized://asset/{}", Uuid::new_v4());
        let duration_ms = start_time.elapsed().as_millis() as u64;

        Ok(VisualCreativeResult {
            asset_url,
            asset_type: "optimized_asset".to_string(),
            metadata: HashMap::from([
                ("original".to_string(), serde_json::json!(description)),
            ]),
            generation_time_ms: duration_ms,
        })
    }

    /// Get request status
    pub async fn get_request(&self, request_id: &str) -> Option<VisualCreativeRequest> {
        self.requests.read().await.get(request_id).cloned()
    }

    /// List all requests
    pub async fn list_requests(&self) -> Vec<VisualCreativeRequest> {
        self.requests.read().await.values().cloned().collect()
    }
}

// Implement Clone for VisualCreativeEngine
impl Clone for VisualCreativeEngine {
    fn clone(&self) -> Self {
        Self {
            router: Arc::clone(&self.router),
            config: Arc::clone(&self.config),
            image_service: Arc::clone(&self.image_service),
            asset_storage: Arc::clone(&self.asset_storage),
            figma: Arc::clone(&self.figma),
            requests: Arc::clone(&self.requests),
        }
    }
}
