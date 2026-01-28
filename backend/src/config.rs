/**
 * Configuration management
 */
use serde::Deserialize;
use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub port: u16,
    pub host: String,
    pub openai_api_key: String,
    pub anthropic_api_key: String,
    pub google_gemini_api_key: String,
    pub jwt_secret: String,
    pub cors_origin: String,
    pub rate_limit_per_minute: u32,
    pub database_url: Option<String>,
    pub redis_url: Option<String>,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Config {
            port: env::var("PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()?,
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            openai_api_key: env::var("OPENAI_API_KEY")
                .unwrap_or_else(|_| String::new()),
            anthropic_api_key: env::var("ANTHROPIC_API_KEY")
                .unwrap_or_else(|_| String::new()),
            google_gemini_api_key: env::var("GOOGLE_GEMINI_API_KEY")
                .unwrap_or_else(|_| String::new()),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "change-me-in-production".to_string()),
            cors_origin: env::var("CORS_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
            rate_limit_per_minute: env::var("RATE_LIMIT_PER_MINUTE")
                .unwrap_or_else(|_| "100".to_string())
                .parse()
                .unwrap_or(100),
            database_url: env::var("DATABASE_URL").ok(),
            redis_url: env::var("REDIS_URL").ok(),
        })
    }
}
