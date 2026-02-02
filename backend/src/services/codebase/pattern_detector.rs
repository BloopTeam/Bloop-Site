/**
 * Pattern Detection System
 * 
 * Detects common code patterns, anti-patterns, and design patterns
 */
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use super::ast_parser::{ASTNode, ParsedSymbol};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedPattern {
    pub pattern_type: PatternType,
    pub name: String,
    pub description: String,
    pub location: super::ast_parser::Location,
    pub confidence: f64,
    pub severity: PatternSeverity,
    pub suggestion: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PatternType {
    DesignPattern,
    AntiPattern,
    CodeSmell,
    BestPractice,
    SecurityIssue,
    PerformanceIssue,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PatternSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

pub struct PatternDetector;

impl PatternDetector {
    pub fn new() -> Self {
        Self
    }

    /// Detect patterns in AST
    pub fn detect_patterns(&self, ast: &ASTNode, code: &str) -> Vec<DetectedPattern> {
        let mut patterns = Vec::new();
        
        // Detect various patterns
        patterns.extend(self.detect_singleton_pattern(ast, code));
        patterns.extend(self.detect_factory_pattern(ast, code));
        patterns.extend(self.detect_observer_pattern(ast, code));
        patterns.extend(self.detect_god_object(ast, code));
        patterns.extend(self.detect_long_method(ast, code));
        patterns.extend(self.detect_duplicate_code(ast, code));
        patterns.extend(self.detect_unused_imports(ast, code));
        patterns.extend(self.detect_magic_numbers(ast, code));
        patterns.extend(self.detect_deep_nesting(ast, code));
        patterns.extend(self.detect_security_issues(ast, code));
        
        patterns
    }

    fn detect_singleton_pattern(&self, ast: &ASTNode, code: &str) -> Vec<DetectedPattern> {
        let mut patterns = Vec::new();
        
        // Look for private constructor and static instance
        if code.contains("private") && code.contains("static") && code.contains("getInstance") {
            patterns.push(DetectedPattern {
                pattern_type: PatternType::DesignPattern,
                name: "Singleton Pattern".to_string(),
                description: "Detected singleton pattern implementation".to_string(),
                location: ast.location.clone(),
                confidence: 0.8,
                severity: PatternSeverity::Info,
                suggestion: Some("Consider if singleton is necessary. Consider dependency injection instead.".to_string()),
            });
        }
        
        patterns
    }

    fn detect_factory_pattern(&self, ast: &ASTNode, code: &str) -> Vec<DetectedPattern> {
        let mut patterns = Vec::new();
        
        // Look for factory methods
        if code.contains("create") || code.contains("Factory") {
            patterns.push(DetectedPattern {
                pattern_type: PatternType::DesignPattern,
                name: "Factory Pattern".to_string(),
                description: "Possible factory pattern detected".to_string(),
                location: ast.location.clone(),
                confidence: 0.6,
                severity: PatternSeverity::Info,
                suggestion: None,
            });
        }
        
        patterns
    }

    fn detect_observer_pattern(&self, ast: &ASTNode, code: &str) -> Vec<DetectedPattern> {
        let mut patterns = Vec::new();
        
        // Look for observer/subscriber patterns
        if code.contains("subscribe") || code.contains("notify") || code.contains("Observer") {
            patterns.push(DetectedPattern {
                pattern_type: PatternType::DesignPattern,
                name: "Observer Pattern".to_string(),
                description: "Possible observer pattern detected".to_string(),
                location: ast.location.clone(),
                confidence: 0.6,
                severity: PatternSeverity::Info,
                suggestion: None,
            });
        }
        
        patterns
    }

    fn detect_god_object(&self, ast: &ASTNode, code: &str) -> Vec<DetectedPattern> {
        let mut patterns = Vec::new();
        
        // Detect classes with too many methods/properties
        let method_count = self.count_methods(ast);
        if method_count > 20 {
            patterns.push(DetectedPattern {
                pattern_type: PatternType::AntiPattern,
                name: "God Object".to_string(),
                description: format!("Class has {} methods, consider splitting", method_count),
                location: ast.location.clone(),
                confidence: 0.7,
                severity: PatternSeverity::Warning,
                suggestion: Some("Split this class into smaller, focused classes".to_string()),
            });
        }
        
        patterns
    }

    fn detect_long_method(&self, ast: &ASTNode, code: &str) -> Vec<DetectedPattern> {
        let mut patterns = Vec::new();
        
        // Detect methods with too many lines
        let line_count = ast.location.end_line - ast.location.start_line;
        if line_count > 50 {
            patterns.push(DetectedPattern {
                pattern_type: PatternType::CodeSmell,
                name: "Long Method".to_string(),
                description: format!("Method has {} lines, consider refactoring", line_count),
                location: ast.location.clone(),
                confidence: 0.8,
                severity: PatternSeverity::Warning,
                suggestion: Some("Extract smaller methods from this long method".to_string()),
            });
        }
        
        patterns
    }

    fn detect_duplicate_code(&self, ast: &ASTNode, code: &str) -> Vec<DetectedPattern> {
        let mut patterns = Vec::new();
        
        // Simple duplicate detection (in production, use more sophisticated algorithms)
        // This is a placeholder for actual duplicate detection
        
        patterns
    }

    fn detect_unused_imports(&self, ast: &ASTNode, code: &str) -> Vec<DetectedPattern> {
        let mut patterns = Vec::new();
        
        // Detect unused imports (would need symbol usage tracking)
        // Placeholder
        
        patterns
    }

    fn detect_magic_numbers(&self, ast: &ASTNode, code: &str) -> Vec<DetectedPattern> {
        let mut patterns = Vec::new();
        
        // Detect magic numbers (numbers without named constants)
        // This would require more sophisticated analysis
        
        patterns
    }

    fn detect_deep_nesting(&self, ast: &ASTNode, code: &str) -> Vec<DetectedPattern> {
        let mut patterns = Vec::new();
        
        let max_depth = self.max_nesting_depth(ast, 0);
        if max_depth > 4 {
            patterns.push(DetectedPattern {
                pattern_type: PatternType::CodeSmell,
                name: "Deep Nesting".to_string(),
                description: format!("Code has nesting depth of {}, consider refactoring", max_depth),
                location: ast.location.clone(),
                confidence: 0.7,
                severity: PatternSeverity::Warning,
                suggestion: Some("Extract nested blocks into separate methods".to_string()),
            });
        }
        
        patterns
    }

    fn detect_security_issues(&self, ast: &ASTNode, code: &str) -> Vec<DetectedPattern> {
        let mut patterns = Vec::new();
        
        // Detect common security issues
        let security_keywords = vec![
            ("eval", "Use of eval() can lead to code injection"),
            ("exec", "Use of exec() can be dangerous"),
            ("SQL", "Potential SQL injection if not parameterized"),
            ("password", "Hardcoded passwords detected"),
            ("secret", "Hardcoded secrets detected"),
        ];

        for (keyword, description) in security_keywords {
            if code.contains(keyword) {
                patterns.push(DetectedPattern {
                    pattern_type: PatternType::SecurityIssue,
                    name: format!("Security Issue: {}", keyword),
                    description: description.to_string(),
                    location: ast.location.clone(),
                    confidence: 0.5,
                    severity: PatternSeverity::Warning,
                    suggestion: Some("Review this code for security vulnerabilities".to_string()),
                });
            }
        }
        
        patterns
    }

    fn count_methods(&self, node: &ASTNode) -> usize {
        let mut count = 0;
        if node.node_type == "method_definition" || 
           node.node_type == "function_declaration" ||
           node.node_type == "function" {
            count += 1;
        }
        
        for child in &node.children {
            count += self.count_methods(child);
        }
        
        count
    }

    fn max_nesting_depth(&self, node: &ASTNode, current_depth: usize) -> usize {
        let mut max_depth = current_depth;
        
        // Check if this node increases nesting (if statements, loops, etc.)
        let increases_nesting = matches!(
            node.node_type.as_str(),
            "if_statement" | "for_statement" | "while_statement" | 
            "try_statement" | "switch_statement" | "match_expression"
        );
        
        let new_depth = if increases_nesting { current_depth + 1 } else { current_depth };
        
        for child in &node.children {
            let child_depth = self.max_nesting_depth(child, new_depth);
            max_depth = max_depth.max(child_depth);
        }
        
        max_depth
    }
}

impl Default for PatternDetector {
    fn default() -> Self {
        Self::new()
    }
}
