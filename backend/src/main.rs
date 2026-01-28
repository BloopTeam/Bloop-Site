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

use config::Config;
use services::ai::router::ModelRouter;

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
    let router = ModelRouter::new(&config);

    // Build application
    let app = create_app(config.clone(), router).await?;

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    let listener = tokio::net::TcpListener::bind(addr).await?;

    info!("✅ Server ready at http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

async fn create_app(config: Config, router: ModelRouter) -> anyhow::Result<Router> {
    // CORS layer
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/chat", post(api::routes::chat::handle_chat))
        .route("/api/v1/agents/create", post(api::routes::agents::create_agent))
        .route("/api/v1/agents/:id", get(api::routes::agents::get_agent_status))
        .route("/api/v1/context/analyze", post(api::routes::context::analyze_context))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CompressionLayer::new())
                .layer(cors)
                .layer(Extension(config))
                .layer(Extension(router))
                .into_inner(),
        );

    Ok(app)
}

async fn health_check() -> &'static str {
    "OK"
}
