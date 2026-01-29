/**
 * File System API Routes
 * 
 * Real file operations - read, write, create, delete files
 */
use axum::{
    extract::{Extension, Path},
    http::StatusCode,
    response::Json,
    body::Body,
};
use serde::{Deserialize, Serialize};
use std::path::{PathBuf, Path as StdPath};
use std::fs;
use std::io::Write;
use crate::config::Config;

#[derive(Serialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub exists: bool,
    pub size: u64,
}

#[derive(Deserialize)]
pub struct WriteFileRequest {
    pub path: String,
    pub content: String,
    pub create_dirs: Option<bool>,
}

#[derive(Serialize)]
pub struct FileOperationResult {
    pub success: bool,
    pub message: String,
    pub path: String,
}

/// Read file content
pub async fn read_file(
    Extension(_config): Extension<Config>,
    Path(file_path): Path<String>,
) -> Result<Json<FileContent>, StatusCode> {
    let path = sanitize_path(&file_path)?;
    
    match fs::read_to_string(&path) {
        Ok(content) => {
            let metadata = fs::metadata(&path).ok();
            Ok(Json(FileContent {
                path: file_path,
                content,
                exists: true,
                size: metadata.map(|m| m.len()).unwrap_or(0),
            }))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            Ok(Json(FileContent {
                path: file_path,
                content: String::new(),
                exists: false,
                size: 0,
            }))
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// Write file content
pub async fn write_file(
    Extension(_config): Extension<Config>,
    Json(payload): Json<WriteFileRequest>,
) -> Result<Json<FileOperationResult>, StatusCode> {
    let path = sanitize_path(&payload.path)?;
    
    // Create parent directories if needed
    if payload.create_dirs.unwrap_or(false) {
        if let Some(parent) = path.parent() {
            if let Err(_) = fs::create_dir_all(parent) {
                return Err(StatusCode::INTERNAL_SERVER_ERROR);
            }
        }
    }
    
    match fs::write(&path, payload.content.as_bytes()) {
        Ok(_) => Ok(Json(FileOperationResult {
            success: true,
            message: "File written successfully".to_string(),
            path: payload.path,
        })),
        Err(e) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// Delete file
pub async fn delete_file(
    Extension(_config): Extension<Config>,
    Path(file_path): Path<String>,
) -> Result<Json<FileOperationResult>, StatusCode> {
    let path = sanitize_path(&file_path)?;
    
    match fs::remove_file(&path) {
        Ok(_) => Ok(Json(FileOperationResult {
            success: true,
            message: "File deleted successfully".to_string(),
            path: file_path,
        })),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// List directory contents
pub async fn list_directory(
    Extension(_config): Extension<Config>,
    Path(dir_path): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let path = sanitize_path(&dir_path)?;
    
    match fs::read_dir(&path) {
        Ok(entries) => {
            let mut files = Vec::new();
            let mut dirs = Vec::new();
            
            for entry in entries {
                if let Ok(entry) = entry {
                    let metadata = entry.metadata().ok();
                    let file_type = if metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false) {
                        "directory"
                    } else {
                        "file"
                    };
                    
                    let info = serde_json::json!({
                        "name": entry.file_name().to_string_lossy(),
                        "path": entry.path().to_string_lossy(),
                        "type": file_type,
                        "size": metadata.as_ref().map(|m| m.len()).unwrap_or(0),
                    });
                    
                    if file_type == "directory" {
                        dirs.push(info);
                    } else {
                        files.push(info);
                    }
                }
            }
            
            Ok(Json(serde_json::json!({
                "path": dir_path,
                "directories": dirs,
                "files": files,
            })))
        }
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
}

/// Sanitize file path to prevent directory traversal
fn sanitize_path(input: &str) -> Result<PathBuf, StatusCode> {
    // Remove any path traversal attempts
    let cleaned = input
        .replace("..", "")
        .replace("~", "")
        .trim_start_matches('/')
        .trim_start_matches('\\');
    
    // Build safe path (relative to current directory or workspace root)
    let path = PathBuf::from(cleaned);
    
    // Ensure path doesn't escape workspace
    if path.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
        return Err(StatusCode::BAD_REQUEST);
    }
    
    Ok(path)
}
