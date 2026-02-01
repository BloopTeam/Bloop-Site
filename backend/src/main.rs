/**
 * Bloop Backend - Main Entry Point
 * High-performance Rust backend for AI-powered development platform
 */
use axum::{
    extract::Extension,
    http::Method,
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower::ServiceBuilder;
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod config;
mod middleware;
mod services;
mod types;
mod utils;
mod database;

use config::Config;
use services::ai::router::ModelRouter;
use services::agent::AgentManager;
use services::codebase::CodebaseIndexer;
use std::sync::Arc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "bloop_backend=info,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    dotenv::dotenv().ok();
    let config = Config::from_env()?;

    info!("🚀 Starting Bloop Backend v{}", env!("CARGO_PKG_VERSION"));
    info!("📍 Listening on {}:{}", config.host, config.port);

    // Initialize model router
    let router = Arc::new(ModelRouter::new(&config));
    
    // Initialize agent manager (returns Arc already)
    let config_arc = Arc::new(config.clone());
    let agent_manager = AgentManager::new(Arc::clone(&router), Arc::clone(&config_arc));
    
    // Initialize codebase indexer
    let codebase_indexer = Arc::new(CodebaseIndexer::new());

    // Initialize database if URL is provided
    let database = if let Some(ref db_url) = config.database_url {
        info!("📦 Connecting to database...");
        match database::Database::new(db_url).await {
            Ok(db) => {
                info!("✅ Database connected");
                Some(Arc::new(db))
            }
            Err(e) => {
                tracing::warn!("⚠️  Database connection failed: {}. Continuing without database.", e);
                None
            }
        }
    } else {
        info!("ℹ️  No database URL provided, running without database");
        None
    };

    // Build application
    let app = create_app(config.clone(), router, agent_manager, codebase_indexer, database).await?;

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    let listener = tokio::net::TcpListener::bind(addr).await?;

    info!("✅ Server ready at http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

async fn create_app(
    config: Config, 
    router: Arc<ModelRouter>,
    agent_manager: Arc<AgentManager>,
    codebase_indexer: Arc<CodebaseIndexer>,
    database: Option<Arc<database::Database>>,
) -> anyhow::Result<Router> {
    // CORS layer
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .route("/health", get(api::routes::health::health_check))
        .route("/health/ready", get(api::routes::health::readiness))
        .route("/health/live", get(api::routes::health::liveness))
        .route("/api/v1/chat", post(api::routes::chat::handle_chat))
        .route("/api/v1/models", get(api::routes::models::list_models))
        .route("/api/v1/agents", get(api::routes::agents::list_agents))
        .route("/api/v1/agents/create", post(api::routes::agents::create_agent))
        .route("/api/v1/agents/:id", get(api::routes::agents::get_agent_status))
        .route("/api/v1/agents/tasks", post(api::routes::agents::create_task))
        .route("/api/v1/agents/tasks", get(api::routes::agents::list_tasks))
        .route("/api/v1/agents/tasks/:id", get(api::routes::agents::get_task_status))
        .route("/api/v1/agents/metrics", get(api::routes::agents::get_metrics))
        .route("/api/v1/agents/queue/status", get(api::routes::agents::get_queue_status))
        .route("/api/v1/agents/health", get(api::routes::agents::get_health_status))
        .route("/api/v1/context/analyze", post(api::routes::context::analyze_context))
        .route("/api/v1/codebase/search", get(api::routes::codebase::search_codebase))
        .route("/api/v1/codebase/review", post(api::routes::codebase::review_code))
        .route("/api/v1/codebase/tests", post(api::routes::codebase::generate_tests))
        .route("/api/v1/codebase/docs", post(api::routes::codebase::generate_docs))
        .route("/api/v1/codebase/dependencies/:file_path", get(api::routes::codebase::get_dependencies))
        .route("/api/v1/files/read/:file_path", get(api::routes::files::read_file))
        .route("/api/v1/files/write", post(api::routes::files::write_file))
        .route("/api/v1/files/delete/:file_path", axum::routing::delete(api::routes::files::delete_file))
        .route("/api/v1/files/list/:dir_path", get(api::routes::files::list_directory))
        .route("/api/v1/execute", post(api::routes::execute::execute_command))
        // OpenClaw integration routes
        .route("/api/v1/openclaw/status", get(api::routes::openclaw::get_status))
        .route("/api/v1/openclaw/sessions", get(api::routes::openclaw::list_sessions))
        .route("/api/v1/openclaw/sessions/:id/history", get(api::routes::openclaw::get_session_history))
        .route("/api/v1/openclaw/message", post(api::routes::openclaw::send_message))
        .route("/api/v1/openclaw/skills", get(api::routes::openclaw::list_skills))
        .route("/api/v1/openclaw/skills/:name/execute", post(api::routes::openclaw::execute_skill))
        // Moltbook integration routes
        .route("/api/v1/moltbook/status", get(api::routes::moltbook::get_status))
        .route("/api/v1/moltbook/profile", get(api::routes::moltbook::get_profile))
        .route("/api/v1/moltbook/register", post(api::routes::moltbook::register_agent))
        .route("/api/v1/moltbook/share", post(api::routes::moltbook::share_code))
        .route("/api/v1/moltbook/skills/trending", get(api::routes::moltbook::get_trending_skills))
        .route("/api/v1/moltbook/feed", get(api::routes::moltbook::get_feed))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CompressionLayer::new())
                .layer(axum::middleware::from_fn(middleware::security::security_headers_middleware))
                .layer(axum::middleware::from_fn(middleware::security::validate_payload_size))
                .layer(cors)
                .layer(Extension(config))
                .layer(Extension(router))
                .layer(Extension(agent_manager))
                .layer(Extension(codebase_indexer))
                .layer(Extension(database))
                .into_inner(),
        );

    Ok(app)
}
        ("openai", ModelProvider::OpenAI, !config.openai_api_key.is_empty()),
        ("anthropic", ModelProvider::Anthropic, !config.anthropic_api_key.is_empty()),
        ("google", ModelProvider::Google, !config.google_gemini_api_key.is_empty()),
        ("moonshot", ModelProvider::Moonshot, !config.moonshot_api_key.is_empty()),
        ("deepseek", ModelProvider::DeepSeek, !config.deepseek_api_key.is_empty()),
        ("mistral", ModelProvider::Mistral, !config.mistral_api_key.is_empty()),
        ("cohere", ModelProvider::Cohere, !config.cohere_api_key.is_empty()),
        ("perplexity", ModelProvider::Perplexity, !config.perplexity_api_key.is_empty()),
        ("xai", ModelProvider::XAI, !config.xai_api_key.is_empty()),
        ("together", ModelProvider::Together, !config.together_api_key.is_empty()),
        ("anyscale", ModelProvider::Anyscale, !config.anyscale_api_key.is_empty()),
        ("qwen", ModelProvider::Qwen, !config.qwen_api_key.is_empty()),
        ("zeroone", ModelProvider::ZeroOne, !config.zeroone_api_key.is_empty()),
        ("baidu", ModelProvider::Baidu, !config.baidu_api_key.is_empty()),
    ];
    
    let mut available_count = 0;
    for (name, provider, configured) in provider_checks {
        let available = configured && router.get_service(provider).is_some();
        if available {
            available_count += 1;
        }
        providers.insert(name, serde_json::json!({
            "configured": configured,
            "available": available
        }));
    }
    
    axum::response::Json(serde_json::json!({
        "status": "healthy",
        "version": env!("CARGO_PKG_VERSION"),
        "providers": {
            "total": providers.len(),
            "available": available_count,
            "details": providers
        }
    }))
}
