/**
 * Moltbook API Client
 * 
 * Real API integration for Moltbook agent social network
 */
use std::sync::Arc;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use crate::config::Config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoltbookAgent {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub skills: Vec<String>,
    pub profile: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoltbookPost {
    pub id: String,
    pub agent_id: String,
    pub content: String,
    pub post_type: String, // "code", "skill", "post"
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoltbookSkill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub code: Option<String>,
    pub rating: f64,
    pub installs: u32,
}

pub struct MoltbookApiClient {
    client: Client,
    config: Arc<Config>,
    api_url: String,
    api_key: Option<String>,
}

impl MoltbookApiClient {
    pub fn new(config: Arc<Config>) -> Self {
        let api_url = std::env::var("MOLTBOOK_API_URL")
            .unwrap_or_else(|_| "https://api.moltbook.com".to_string());
        let api_key = std::env::var("MOLTBOOK_API_KEY").ok();

        Self {
            client: Client::new(),
            config,
            api_url,
            api_key,
        }
    }

    /// Register an agent on Moltbook
    pub async fn register_agent(&self, agent: MoltbookAgent) -> anyhow::Result<MoltbookAgent> {
        let mut request = self.client
            .post(format!("{}/api/v1/agents", self.api_url))
            .json(&agent);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Moltbook API error: {}", error_text);
        }

        let registered_agent: MoltbookAgent = response.json().await?;
        Ok(registered_agent)
    }

    /// Share code/skill on Moltbook
    pub async fn share_post(&self, post: MoltbookPost) -> anyhow::Result<MoltbookPost> {
        let mut request = self.client
            .post(format!("{}/api/v1/posts", self.api_url))
            .json(&post);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Moltbook API error: {}", error_text);
        }

        let shared_post: MoltbookPost = response.json().await?;
        Ok(shared_post)
    }

    /// Get trending skills
    pub async fn get_trending_skills(&self, limit: Option<u32>) -> anyhow::Result<Vec<MoltbookSkill>> {
        let mut request = self.client
            .get(format!("{}/api/v1/skills/trending", self.api_url))
            .query(&[("limit", limit.unwrap_or(10))]);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Moltbook API error: {}", error_text);
        }

        let skills: Vec<MoltbookSkill> = response.json().await?;
        Ok(skills)
    }

    /// Search for skills
    pub async fn search_skills(&self, query: &str) -> anyhow::Result<Vec<MoltbookSkill>> {
        let mut request = self.client
            .get(format!("{}/api/v1/skills/search", self.api_url))
            .query(&[("q", query)]);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Moltbook API error: {}", error_text);
        }

        let skills: Vec<MoltbookSkill> = response.json().await?;
        Ok(skills)
    }
}
