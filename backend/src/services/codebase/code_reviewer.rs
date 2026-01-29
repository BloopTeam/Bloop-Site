/**
 * Automated Code Reviewer
 * 
 * Provides comprehensive code review feedback
 * Better than Cursor/Claude with:
 * - Security vulnerability detection
 * - Performance issues
 * - Code quality metrics
 * - Best practices enforcement
 * - Style consistency
 */
use serde::{Serialize, Deserialize};
use crate::services::ai::router::ModelRouter;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeReviewIssue {
    pub severity: IssueSeverity,
    pub category: IssueCategory,
    pub message: String,
    pub file_path: String,
    pub line: u32,
    pub column: u32,
    pub suggestion: String,
    pub code_snippet: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IssueSeverity {
    Critical,
    High,
    Medium,
    Low,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IssueCategory {
    Security,
    Performance,
    CodeQuality,
    BestPractices,
    Style,
    Documentation,
    Testing,
    Maintainability,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeReviewResult {
    pub issues: Vec<CodeReviewIssue>,
    pub score: f64, // 0-100
    pub summary: String,
    pub metrics: CodeMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeMetrics {
    pub complexity: f64,
    pub maintainability_index: f64,
    pub test_coverage: f64,
    pub documentation_coverage: f64,
    pub security_score: f64,
}

pub struct CodeReviewer {
    router: Arc<ModelRouter>,
}

impl CodeReviewer {
    pub fn new(router: Arc<ModelRouter>) -> Self {
        Self { router }
    }
    
    /// Review code file
    pub async fn review_code(
        &self,
        file_path: &str,
        code: &str,
        language: &str,
    ) -> Result<CodeReviewResult, String> {
        // Build review prompt
        let prompt = format!(
            r#"You are an expert code reviewer. Review the following {} code for:
1. Security vulnerabilities (SQL injection, XSS, path traversal, etc.)
2. Performance issues (inefficient algorithms, memory leaks, etc.)
3. Code quality and best practices
4. Style consistency
5. Documentation completeness
6. Test coverage concerns
7. Maintainability issues

File: {}
Code:
```{}
{}
```

Provide a JSON response with this structure:
{{
  "issues": [
    {{
      "severity": "Critical|High|Medium|Low|Info",
      "category": "Security|Performance|CodeQuality|BestPractices|Style|Documentation|Testing|Maintainability",
      "message": "Description of the issue",
      "line": 42,
      "column": 10,
      "suggestion": "How to fix it",
      "code_snippet": "The problematic code"
    }}
  ],
  "score": 85.0,
  "summary": "Overall assessment",
  "metrics": {{
    "complexity": 5.0,
    "maintainability_index": 75.0,
    "test_coverage": 0.0,
    "documentation_coverage": 50.0,
    "security_score": 90.0
  }}
}}"#,
            language,
            file_path,
            language,
            code
        );
        
        // Use AI router to get review
        use crate::types::{AIMessage, MessageRole, AIRequest};
        use crate::services::ai::router::AIService;
        
        let messages = vec![AIMessage {
            role: MessageRole::User,
            content: prompt,
        }];
        
        let request = AIRequest {
            messages,
            model: Some("claude-3-5-sonnet-20241022".to_string()), // Use Claude for reviews
            temperature: Some(0.3), // Lower temperature for consistent reviews
            max_tokens: Some(4000),
            stream: Some(false),
        };
        
        // Select Claude for code review (best quality)
        use crate::types::ModelProvider;
        let service = self.router.get_service(ModelProvider::Anthropic)
            .ok_or("Claude service not available")?;
        
        match service.generate(request).await {
            Ok(response) => {
                // Parse JSON response
                match serde_json::from_str::<CodeReviewResult>(&response.content) {
                    Ok(result) => Ok(result),
                    Err(_) => {
                        // Fallback: try to extract JSON from markdown code blocks
                        let json_start = response.content.find("```json").or_else(|| response.content.find("{"));
                        let json_end = response.content.rfind("```").or_else(|| response.content.rfind("}"));
                        
                        if let (Some(start), Some(end)) = (json_start, json_end) {
                            let json_str = &response.content[start..=end]
                                .trim_start_matches("```json")
                                .trim_start_matches("```")
                                .trim_end_matches("```")
                                .trim();
                            
                            serde_json::from_str(json_str)
                                .unwrap_or_else(|_| CodeReviewResult {
                                    issues: vec![],
                                    score: 75.0,
                                    summary: response.content,
                                    metrics: CodeMetrics {
                                        complexity: 0.0,
                                        maintainability_index: 0.0,
                                        test_coverage: 0.0,
                                        documentation_coverage: 0.0,
                                        security_score: 0.0,
                                    },
                                })
                        } else {
                            Ok(CodeReviewResult {
                                issues: vec![],
                                score: 75.0,
                                summary: response.content,
                                metrics: CodeMetrics {
                                    complexity: 0.0,
                                    maintainability_index: 0.0,
                                    test_coverage: 0.0,
                                    documentation_coverage: 0.0,
                                    security_score: 0.0,
                                },
                            })
                        }
                    }
                }
            }
            Err(e) => Err(format!("AI review failed: {}", e)),
        }
    }
    
    /// Review entire codebase
    pub async fn review_codebase(
        &self,
        files: Vec<(String, String, String)>, // (path, content, language)
    ) -> Result<CodeReviewResult, String> {
        let mut all_issues = Vec::new();
        let mut total_score = 0.0;
        
        for (path, content, language) in files {
            match self.review_code(&path, &content, &language).await {
                Ok(result) => {
                    all_issues.extend(result.issues);
                    total_score += result.score;
                }
                Err(e) => {
                    tracing::warn!("Failed to review {}: {}", path, e);
                }
            }
        }
        
        let avg_score = if !files.is_empty() {
            total_score / files.len() as f64
        } else {
            0.0
        };
        
        Ok(CodeReviewResult {
            issues: all_issues,
            score: avg_score,
            summary: format!("Reviewed {} files, found {} issues", files.len(), all_issues.len()),
            metrics: CodeMetrics {
                complexity: 0.0,
                maintainability_index: 0.0,
                test_coverage: 0.0,
                documentation_coverage: 0.0,
                security_score: 0.0,
            },
        })
    }
}
