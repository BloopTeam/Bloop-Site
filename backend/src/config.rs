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
    pub moonshot_api_key: String,
    pub deepseek_api_key: String,
    pub mistral_api_key: String,
    pub cohere_api_key: String,
    pub perplexity_api_key: String,
    pub xai_api_key: String,
    pub together_api_key: String,
    pub anyscale_api_key: String,
    pub qwen_api_key: String,
    pub zeroone_api_key: String,
    pub baidu_api_key: String,
    pub jwt_secret: String,
    pub cors_origin: String,
    pub rate_limit_per_minute: u32,
    pub database_url: Option<String>,
    pub redis_url: Option<String>,
    // Security settings
    pub max_request_size: usize,
    pub enable_csrf: bool,
    pub allowed_websocket_origins: Vec<String>,
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
            moonshot_api_key: env::var("MOONSHOT_API_KEY")
                .unwrap_or_else(|_| String::new()),
            deepseek_api_key: env::var("DEEPSEEK_API_KEY")
                .unwrap_or_else(|_| String::new()),
            mistral_api_key: env::var("MISTRAL_API_KEY")
                .unwrap_or_else(|_| String::new()),
            cohere_api_key: env::var("COHERE_API_KEY")
                .unwrap_or_else(|_| String::new()),
            perplexity_api_key: env::var("PERPLEXITY_API_KEY")
                .unwrap_or_else(|_| String::new()),
            xai_api_key: env::var("XAI_API_KEY")
                .unwrap_or_else(|_| String::new()),
            together_api_key: env::var("TOGETHER_API_KEY")
                .unwrap_or_else(|_| String::new()),
            anyscale_api_key: env::var("ANYSCALE_API_KEY")
                .unwrap_or_else(|_| String::new()),
            qwen_api_key: env::var("QWEN_API_KEY")
                .unwrap_or_else(|_| String::new()),
            zeroone_api_key: env::var("ZEROONE_API_KEY")
                .unwrap_or_else(|_| String::new()),
            baidu_api_key: env::var("BAIDU_API_KEY")
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
            max_request_size: env::var("MAX_REQUEST_SIZE")
                .unwrap_or_else(|_| "10485760".to_string()) // 10MB default
                .parse()
                .unwrap_or(10 * 1024 * 1024),
            enable_csrf: env::var("ENABLE_CSRF")
                .map(|v| v == "true")
                .unwrap_or(false),
            allowed_websocket_origins: env::var("ALLOWED_WS_ORIGINS")
                .unwrap_or_else(|_| "http://localhost:5173,ws://localhost:5173".to_string())
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
        })
    }
}
