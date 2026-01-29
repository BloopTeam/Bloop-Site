/**
 * Code Execution API Routes
 * 
 * Execute code and terminal commands safely
 */
use axum::{
    extract::Extension,
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::Duration;
use tokio::time::timeout;
use crate::config::Config;

#[derive(Deserialize)]
pub struct ExecuteRequest {
    pub command: String,
    pub args: Option<Vec<String>>,
    pub working_dir: Option<String>,
    pub timeout_seconds: Option<u64>,
}

#[derive(Serialize)]
pub struct ExecuteResponse {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub execution_time_ms: u64,
}

/// Execute command safely
pub async fn execute_command(
    Extension(_config): Extension<Config>,
    Json(payload): Json<ExecuteRequest>,
) -> Result<Json<ExecuteResponse>, StatusCode> {
    // Whitelist allowed commands for security
    let allowed_commands = vec![
        "npm", "node", "cargo", "rustc", "python", "python3",
        "git", "ls", "pwd", "cat", "echo", "grep", "find",
        "cd", "mkdir", "rm", "cp", "mv",
    ];
    
    let command_name = payload.command.split_whitespace().next().unwrap_or("");
    if !allowed_commands.iter().any(|&cmd| command_name.starts_with(cmd)) {
        return Ok(Json(ExecuteResponse {
            success: false,
            stdout: String::new(),
            stderr: format!("Command '{}' is not allowed", command_name),
            exit_code: Some(1),
            execution_time_ms: 0,
        }));
    }
    
    let start_time = std::time::Instant::now();
    let timeout_duration = Duration::from_secs(payload.timeout_seconds.unwrap_or(30));
    
    let mut cmd = Command::new(&payload.command);
    
    if let Some(args) = payload.args {
        cmd.args(args);
    }
    
    if let Some(working_dir) = payload.working_dir {
        cmd.current_dir(working_dir);
    }
    
    // Execute with timeout
    match timeout(timeout_duration, tokio::task::spawn_blocking(move || {
        cmd.output()
    })).await {
        Ok(Ok(Ok(output))) => {
            let execution_time = start_time.elapsed().as_millis() as u64;
            Ok(Json(ExecuteResponse {
                success: output.status.success(),
                stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                exit_code: output.status.code(),
                execution_time_ms: execution_time,
            }))
        }
        Ok(Ok(Err(_))) => Err(StatusCode::INTERNAL_SERVER_ERROR),
        Ok(Err(_)) => Err(StatusCode::INTERNAL_SERVER_ERROR),
        Err(_) => Ok(Json(ExecuteResponse {
            success: false,
            stdout: String::new(),
            stderr: "Command execution timed out".to_string(),
            exit_code: Some(124),
            execution_time_ms: timeout_duration.as_millis() as u64,
        })),
    }
}
