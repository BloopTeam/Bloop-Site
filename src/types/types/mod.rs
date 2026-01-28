use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub file_type: FileType,
    pub path: Option<String>,
    pub children: Option<Vec<FileNode>>,
    pub modified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileType {
    File,
    Folder,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorTab {
    pub id: String,
    pub name: String,
    pub path: Vec<String>,
    pub content: String,
    pub modified: bool,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub role: MessageRole,
    pub content: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ToastType {
    Success,
    Error,
    Warning,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Toast {
    pub id: String,
    pub toast_type: ToastType,
    pub message: String,
    pub duration: Option<u32>,
}
