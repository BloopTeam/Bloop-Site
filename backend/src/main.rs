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
mod config_validation;
mod middleware;
mod services;
mod types;
mod utils;
mod security;
mod database;

use config::Config;
use services::ai::router::ModelRouter;
use services::agent::AgentManager;
use services::codebase::CodebaseIndexer;
use services::company::CompanyOrchestrator;
use services::collaboration::{SessionManager, CollaborationWebSocket, PresenceTracker, ConflictResolver};
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

    // Validate configuration
    if let Err(e) = config_validation::validate_config(&config) {
        tracing::error!("Configuration validation failed: {}", e);
        return Err(e.into());
    }

    info!("Starting Bloop Backend v{}", env!("CARGO_PKG_VERSION"));
    info!("Listening on {}:{}", config.host, config.port);

    // Initialize model router
    let router = Arc::new(ModelRouter::new(&config));
    
    // Initialize agent manager
    let config_arc = Arc::new(config.clone());
    let agent_manager = Arc::new(AgentManager::new(Arc::clone(&router), Arc::clone(&config_arc)));
    
    // Initialize codebase indexer
    let codebase_indexer = Arc::new(CodebaseIndexer::new());

    // Initialize security services
    let validator = Arc::new(security::AdvancedValidator::new());
    let audit_logger = Arc::new(security::AuditLogger::new(10000));
    let vulnerability_scanner = Arc::new(security::VulnerabilityScanner::new());
    let threat_detector = Arc::new(security::ThreatDetector::new());
    let rate_limiter = Arc::new(security::AdaptiveRateLimiter::default());
    
    info!("Security services initialized");

    // Initialize database if URL is provided
    let database = if let Some(ref db_url) = config.database_url {
        info!("Connecting to database...");
        match database::Database::new(db_url).await {
            Ok(db) => {
                info!("Database connected");
                Some(Arc::new(db))
            }
            Err(e) => {
                tracing::warn!("Database connection failed: {}. Continuing without database.", e);
                None
            }
        }
    } else {
        info!("No database URL provided, running without database");
        None
    };

    // Initialize agent company orchestrator (after database)
    let company_orchestrator = CompanyOrchestrator::new(
        Arc::clone(&agent_manager),
        Arc::clone(&router),
        Arc::clone(&config_arc),
        database.clone(),
    );
    info!("Agent Company initialized");

    // Initialize collaboration services (Phase 4)
    let session_manager = SessionManager::new(
        database.clone(),
        Arc::clone(&audit_logger),
    );
    let presence_tracker = PresenceTracker::new();
    let conflict_resolver = ConflictResolver::new(
        Arc::clone(&codebase_indexer),
        database.clone(),
    );
    let collaboration_websocket = CollaborationWebSocket::new(
        Arc::clone(&session_manager),
        Arc::clone(&presence_tracker),
        Arc::clone(&conflict_resolver),
        Arc::clone(&agent_manager),
        Arc::clone(&codebase_indexer),
        Arc::clone(&validator),
    );
    info!("Collaboration services initialized");

    // Build application
    let app = create_app(
        config.clone(), 
        router, 
        agent_manager, 
        codebase_indexer, 
        database, 
        company_orchestrator,
        audit_logger,
        vulnerability_scanner,
        threat_detector,
        session_manager,
        collaboration_websocket,
    ).await?;

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    let listener = tokio::net::TcpListener::bind(addr).await?;

    info!("Server ready at http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

async fn create_app(
    config: Config, 
    router: Arc<ModelRouter>,
    agent_manager: Arc<AgentManager>,
    codebase_indexer: Arc<CodebaseIndexer>,
    database: Option<Arc<database::Database>>,
    company_orchestrator: Arc<CompanyOrchestrator>,
    audit_logger: Arc<security::AuditLogger>,
    vulnerability_scanner: Arc<security::VulnerabilityScanner>,
    threat_detector: Arc<security::ThreatDetector>,
    session_manager: Arc<SessionManager>,
    collaboration_websocket: Arc<CollaborationWebSocket>,
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
        // Company routes
        .route("/api/v1/company/status", get(api::routes::company::get_status))
        .route("/api/v1/company/members", get(api::routes::company::get_members))
        .route("/api/v1/company/teams", get(api::routes::company::get_teams))
        // Collaboration routes (Phase 4)
        .route("/api/v1/collaboration/sessions", axum::routing::post(api::routes::collaboration::create_session))
        .route("/api/v1/collaboration/sessions/:id", get(api::routes::collaboration::get_session))
        .route("/api/v1/collaboration/sessions/:id/join", axum::routing::post(api::routes::collaboration::join_session))
        .route("/api/v1/collaboration/sessions/:id/participants", get(api::routes::collaboration::list_participants))
        .route("/api/v1/collaboration/sessions/token/:token", get(api::routes::collaboration::get_session_by_token))
        .route("/api/v1/collaboration/ws/:session_id", get(api::routes::collaboration::collaboration_websocket_handler))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CompressionLayer::new())
                .layer(axum::middleware::from_fn(middleware::request_id::request_id_middleware))
                .layer(axum::middleware::from_fn(middleware::security::security_headers_middleware))
                .layer(axum::middleware::from_fn(middleware::security::validate_payload_size))
                .layer(cors)
                .layer(Extension(config))
                .layer(Extension(router))
                .layer(Extension(agent_manager))
                .layer(Extension(codebase_indexer))
                .layer(Extension(database))
                .layer(Extension(company_orchestrator))
                .layer(Extension(audit_logger))
                .layer(Extension(vulnerability_scanner))
                .layer(Extension(threat_detector))
                .layer(Extension(session_manager))
                .layer(Extension(collaboration_websocket))
                .layer(Extension(validator))
                .into_inner(),
        );

    Ok(app)
}
