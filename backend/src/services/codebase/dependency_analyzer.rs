/**
 * Dependency Analyzer
 * 
 * Analyzes dependencies between files and modules
 */
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyGraph {
    pub nodes: Vec<DependencyNode>,
    pub edges: Vec<DependencyEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyNode {
    pub file_path: String,
    pub module_name: String,
    pub exports: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyEdge {
    pub from: String,
    pub to: String,
    pub dependency_type: DependencyType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DependencyType {
    Import,
    Extends,
    Implements,
    Uses,
}

use super::indexer::CodeSymbol;

pub struct DependencyAnalyzer;

impl DependencyAnalyzer {
    /// Analyze dependencies from a list of files
    pub fn analyze(files: Vec<(String, String)>) -> DependencyGraph {
        let mut nodes = Vec::new();
        let mut edges = Vec::new();
        
        for (file_path, content) in files {
            // Extract module name from file path
            let module_name = Self::extract_module_name(&file_path);
            
            // Extract exports (simplified - would use AST parser in production)
            let exports = Self::extract_exports(&content);
            
            nodes.push(DependencyNode {
                file_path: file_path.clone(),
                module_name: module_name.clone(),
                exports,
            });
        }
        
        // Build edges based on imports
        for (i, (file_path, content)) in files.iter().enumerate() {
            let imports = Self::extract_imports(content);
            for import in imports {
                // Find node that exports this import
                if let Some(target_idx) = nodes.iter().position(|n| {
                    n.module_name == import || n.exports.contains(&import)
                }) {
                    edges.push(DependencyEdge {
                        from: file_path.clone(),
                        to: nodes[target_idx].file_path.clone(),
                        dependency_type: DependencyType::Import,
                    });
                }
            }
        }
        
        DependencyGraph { nodes, edges }
    }

    /// Analyze dependencies from imports and symbols
    pub fn analyze_dependencies(imports: &[String], symbols: &[CodeSymbol]) -> Vec<String> {
        let mut dependencies = Vec::new();
        
        // Add direct imports
        dependencies.extend(imports.iter().cloned());
        
        // Extract dependencies from symbol references
        for symbol in symbols {
            for reference in &symbol.references {
                if !dependencies.contains(&reference.file_path) {
                    dependencies.push(reference.file_path.clone());
                }
            }
        }
        
        dependencies
    }

    fn extract_module_name(file_path: &str) -> String {
        // Extract module name from file path
        file_path
            .split('/')
            .last()
            .unwrap_or(file_path)
            .split('.')
            .next()
            .unwrap_or(file_path)
            .to_string()
    }

    fn extract_exports(content: &str) -> Vec<String> {
        let mut exports = Vec::new();
        
        // Simple regex-based extraction (in production, use AST parser)
        // Look for export keywords
        for line in content.lines() {
            if line.contains("export ") {
                if let Some(name) = Self::extract_name_from_line(line) {
                    exports.push(name);
                }
            }
        }
        
        exports
    }

    fn extract_imports(content: &str) -> Vec<String> {
        let mut imports = Vec::new();
        
        // Simple extraction (in production, use AST parser)
        for line in content.lines() {
            if line.contains("import ") || line.contains("from ") || line.contains("require(") {
                if let Some(import) = Self::extract_import_from_line(line) {
                    imports.push(import);
                }
            }
        }
        
        imports
    }

    fn extract_name_from_line(line: &str) -> Option<String> {
        // Simple extraction - in production, use AST parser
        if let Some(start) = line.find("export ") {
            let rest = &line[start + 7..];
            if let Some(end) = rest.find(|c: char| c == ' ' || c == '{' || c == '=') {
                Some(rest[..end].trim().to_string())
            } else {
                Some(rest.trim().to_string())
            }
        } else {
            None
        }
    }

    fn extract_import_from_line(line: &str) -> Option<String> {
        // Simple extraction - in production, use AST parser
        if let Some(start) = line.find("from ") {
            let rest = &line[start + 5..];
            if let Some(end) = rest.find(|c: char| c == ';' || c == '\'' || c == '"') {
                Some(rest[..end].trim_matches(|c| c == '\'' || c == '"').to_string())
            } else {
                Some(rest.trim_matches(|c| c == '\'' || c == '"').to_string())
            }
        } else if let Some(start) = line.find("require(") {
            let rest = &line[start + 8..];
            if let Some(end) = rest.find(')') {
                Some(rest[..end].trim_matches(|c| c == '\'' || c == '"').to_string())
            } else {
                None
            }
        } else {
            None
        }
    }
}
