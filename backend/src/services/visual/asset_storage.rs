/**
 * Asset Storage Service
 * 
 * Manages storage and versioning of visual assets
 */
use std::sync::Arc;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;
use crate::database::Database;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StoredAsset {
    pub id: String,
    pub asset_url: String,
    pub asset_type: String,
    pub original_request: String,
    pub metadata: HashMap<String, serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub version: u32,
    pub parent_id: Option<String>, // For versioning
}

pub struct AssetStorage {
    database: Option<Arc<Database>>,
    assets: Arc<tokio::sync::RwLock<HashMap<String, StoredAsset>>>,
}

impl AssetStorage {
    pub fn new(database: Option<Arc<Database>>) -> Self {
        Self {
            database,
            assets: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }

    /// Store an asset
    pub async fn store_asset(
        &self,
        asset_url: String,
        asset_type: String,
        original_request: String,
        metadata: HashMap<String, serde_json::Value>,
    ) -> String {
        let asset_id = Uuid::new_v4().to_string();
        
        let asset = StoredAsset {
            id: asset_id.clone(),
            asset_url,
            asset_type,
            original_request,
            metadata,
            created_at: Utc::now(),
            version: 1,
            parent_id: None,
        };

        // Store in memory
        let mut assets = self.assets.write().await;
        assets.insert(asset_id.clone(), asset.clone());
        drop(assets);

        // Store in database if available
        if let Some(ref db) = self.database {
            let _ = sqlx::query(
                "INSERT INTO visual_creative_requests (request_id, request_type, description, requirements, status, result)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (request_id) DO UPDATE SET result = EXCLUDED.result"
            )
            .bind(&asset_id)
            .bind(&asset.asset_type)
            .bind(&asset.original_request)
            .bind(&serde_json::to_value(&asset.metadata).unwrap_or_default())
            .bind("completed")
            .bind(&serde_json::to_value(&asset).unwrap_or_default())
            .execute(db.pool())
            .await;
        }

        asset_id
    }

    /// Get asset by ID
    pub async fn get_asset(&self, asset_id: &str) -> Option<StoredAsset> {
        self.assets.read().await.get(asset_id).cloned()
    }

    /// List all assets
    pub async fn list_assets(&self) -> Vec<StoredAsset> {
        self.assets.read().await.values().cloned().collect()
    }

    /// Create new version of asset
    pub async fn create_version(
        &self,
        parent_id: &str,
        new_asset_url: String,
        metadata: HashMap<String, serde_json::Value>,
    ) -> Option<String> {
        let parent = self.get_asset(parent_id).await?;
        
        let new_version = StoredAsset {
            id: Uuid::new_v4().to_string(),
            asset_url: new_asset_url,
            asset_type: parent.asset_type.clone(),
            original_request: parent.original_request.clone(),
            metadata,
            created_at: Utc::now(),
            version: parent.version + 1,
            parent_id: Some(parent_id.to_string()),
        };

        let new_id = new_version.id.clone();
        let mut assets = self.assets.write().await;
        assets.insert(new_id.clone(), new_version);
        
        new_id.into()
    }
}
