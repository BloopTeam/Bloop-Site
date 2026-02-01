/**
 * Configuration validation
 * Validates environment variables and configuration on startup
 */
use crate::config::Config;
use anyhow::{Context, Result};

pub fn validate_config(config: &Config) -> Result<()> {
    // Validate port range
    if config.port == 0 || config.port > 65535 {
        anyhow::bail!("Invalid port number: {}", config.port);
    }

    // Validate JWT secret in production
    if config.jwt_secret == "change-me-in-production" {
        tracing::warn!("⚠️  Using default JWT secret. Change JWT_SECRET in production!");
    }

    // Validate database URL format if provided
    if let Some(ref db_url) = config.database_url {
        if !db_url.starts_with("postgresql://") && !db_url.starts_with("postgres://") {
            anyhow::bail!("Invalid database URL format. Must start with postgresql:// or postgres://");
        }
    }

    // Validate Redis URL format if provided
    if let Some(ref redis_url) = config.redis_url {
        if !redis_url.starts_with("redis://") && !redis_url.starts_with("rediss://") {
            anyhow::bail!("Invalid Redis URL format. Must start with redis:// or rediss://");
        }
    }

    // Validate CORS origin
    if config.cors_origin.is_empty() {
        tracing::warn!("⚠️  CORS_ORIGIN is empty. CORS may not work correctly.");
    }

    // Validate request size limits
    if config.max_request_size == 0 {
        anyhow::bail!("MAX_REQUEST_SIZE must be greater than 0");
    }

    if config.max_request_size > 100 * 1024 * 1024 {
        tracing::warn!("⚠️  MAX_REQUEST_SIZE is very large ({}MB). Consider reducing it.", config.max_request_size / 1024 / 1024);
    }

    // Check if at least one AI provider is configured
    let has_provider = !config.openai_api_key.is_empty()
        || !config.anthropic_api_key.is_empty()
        || !config.google_gemini_api_key.is_empty()
        || !config.moonshot_api_key.is_empty()
        || !config.deepseek_api_key.is_empty()
        || !config.mistral_api_key.is_empty()
        || !config.cohere_api_key.is_empty()
        || !config.perplexity_api_key.is_empty()
        || !config.xai_api_key.is_empty()
        || !config.together_api_key.is_empty()
        || !config.anyscale_api_key.is_empty()
        || !config.qwen_api_key.is_empty()
        || !config.zeroone_api_key.is_empty()
        || !config.baidu_api_key.is_empty();

    if !has_provider {
        tracing::warn!("⚠️  No AI provider API keys configured. AI features will not work.");
    }

    Ok(())
}
