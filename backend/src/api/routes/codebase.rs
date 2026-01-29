/**
 * Codebase API Routes
 * 
 * Endpoints for codebase analysis, search, review, etc.
 */
use axum::{
    extract::{Extension, Path, Query},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::services::codebase::*;
use crate::services::ai::router::ModelRouter;
use crate::config::Config;

#[derive(Deserialize)]
pub struct SearchRequest {
    pub query: String,
}

#[derive(Serialize)]
pub struct SearchResponse {
    pub results: Vec<semantic_search::SearchResult>,
}

/// Semantic code search
pub async fn search_codebase(
    Extension(_config): Extension<Config>,
    Extension(indexer): Extension<Arc<CodebaseIndexer>>,
    Query(params): Query<SearchRequest>,
) -> Result<Json<SearchResponse>, StatusCode> {
    let semantic_search = SemanticSearch::new(Arc::clone(&indexer));
    let results = semantic_search.search(&params.query).await;
    
    Ok(Json(SearchResponse { results }))
}

/// Review code
pub async fn review_code(
    Extension(_config): Extension<Config>,
    Extension(router): Extension<Arc<ModelRouter>>,
    Json(payload): Json<ReviewCodeRequest>,
) -> Result<Json<super::codebase::code_reviewer::CodeReviewResult>, StatusCode> {
    let reviewer = CodeReviewer::new(Arc::clone(&router));
    let result = reviewer.review_code(&payload.file_path, &payload.code, &payload.language)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct ReviewCodeRequest {
    pub file_path: String,
    pub code: String,
    pub language: String,
}

/// Generate tests
pub async fn generate_tests(
    Extension(_config): Extension<Config>,
    Extension(router): Extension<Arc<ModelRouter>>,
    Json(payload): Json<GenerateTestsRequest>,
) -> Result<Json<test_generator::TestGenerationResult>, StatusCode> {
    let generator = TestGenerator::new(Arc::clone(&router));
    let result = generator.generate_tests(
        &payload.code,
        &payload.language,
        payload.function_name.as_deref(),
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct GenerateTestsRequest {
    pub code: String,
    pub language: String,
    pub function_name: Option<String>,
}

/// Generate documentation
pub async fn generate_docs(
    Extension(_config): Extension<Config>,
    Extension(router): Extension<Arc<ModelRouter>>,
    Json(payload): Json<GenerateDocsRequest>,
) -> Result<Json<doc_generator::Documentation>, StatusCode> {
    let generator = DocGenerator::new(Arc::clone(&router));
    let result = generator.generate_docs(&payload.code, &payload.language, &payload.file_path)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct GenerateDocsRequest {
    pub code: String,
    pub language: String,
    pub file_path: String,
}

/// Get dependencies
pub async fn get_dependencies(
    Extension(_config): Extension<Config>,
    Extension(indexer): Extension<Arc<CodebaseIndexer>>,
    Path(file_path): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let deps = indexer.get_dependencies(&file_path).await;
    let dependents = indexer.get_dependents(&file_path).await;
    
    Ok(Json(serde_json::json!({
        "dependencies": deps,
        "dependents": dependents,
    })))
}
