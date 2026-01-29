/**
 * Documentation Generator
 * 
 * Auto-generates comprehensive documentation
 * Better than Cursor/Claude with:
 * - API documentation
 * - Code examples
 * - Usage guides
 * - Architecture diagrams (text-based)
 */
use serde::{Serialize, Deserialize};
use crate::services::ai::router::ModelRouter;
use std::sync::Arc;

fn parse_documentation(content: &str, code: &str, language: &str) -> Documentation {
    // Parse documentation from AI response
    // Extract sections
    let overview = extract_section(content, "Overview", "API Reference")
        .unwrap_or_else(|| "Generated documentation".to_string());
    
    let api_reference = extract_api_reference(content, code);
    let examples = extract_examples(content, language);
    let usage_guide = extract_section(content, "Usage", "Architecture")
        .unwrap_or_else(|| "See examples below".to_string());
    let architecture = extract_section(content, "Architecture", "")
        .unwrap_or_else(|| "Architecture documentation".to_string());
    
    Documentation {
        overview,
        api_reference,
        examples,
        usage_guide,
        architecture,
    }
}

fn extract_section(content: &str, start_marker: &str, end_marker: &str) -> Option<String> {
    if let Some(start) = content.find(start_marker) {
        let end = if !end_marker.is_empty() {
            content[start..].find(end_marker).map(|i| start + i)
        } else {
            None
        };
        
        let section = if let Some(end) = end {
            &content[start..end]
        } else {
            &content[start..]
        };
        
        return Some(section.trim().to_string());
    }
    None
}

fn extract_api_reference(content: &str, code: &str) -> Vec<APIDoc> {
    // Extract API documentation
    // This is simplified - in production, parse from AST
    let mut apis = Vec::new();
    
    // Find function/class definitions in code
    let lines: Vec<&str> = code.lines().collect();
    for (i, line) in lines.iter().enumerate() {
        if line.contains("function") || line.contains("class") || line.contains("def") {
            if let Some(name) = extract_name(line) {
                apis.push(APIDoc {
                    name,
                    signature: line.trim().to_string(),
                    description: format!("Function at line {}", i + 1),
                    parameters: vec![],
                    return_type: "void".to_string(),
                    return_description: "".to_string(),
                    examples: vec![],
                });
            }
        }
    }
    
    apis
}

fn extract_name(line: &str) -> Option<String> {
    // Extract function/class name
    if let Some(start) = line.find("function") {
        if let Some(name_start) = line[start+8..].find(|c: char| c.is_alphanumeric() || c == '_') {
            let name_part = &line[start+8+name_start..];
            if let Some(end) = name_part.find(|c: char| !c.is_alphanumeric() && c != '_') {
                return Some(name_part[..end].to_string());
            }
            return Some(name_part.split_whitespace().next().unwrap_or("").to_string());
        }
    }
    None
}

fn extract_examples(content: &str, language: &str) -> Vec<CodeExample> {
    let mut examples = Vec::new();
    
    // Find code blocks in documentation
    let code_block_pattern = format!(r"```{}?\s*\n(.*?)```", language);
    // Simplified: find all code blocks
    let mut start = 0;
    while let Some(pos) = content[start..].find("```") {
        let block_start = start + pos + 3;
        if let Some(end) = content[block_start..].find("```") {
            let code = content[block_start..block_start+end].trim().to_string();
            examples.push(CodeExample {
                title: format!("Example {}", examples.len() + 1),
                description: "Code example".to_string(),
                code,
                language: language.to_string(),
            });
            start = block_start + end + 3;
        } else {
            break;
        }
    }
    
    examples
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Documentation {
    pub overview: String,
    pub api_reference: Vec<APIDoc>,
    pub examples: Vec<CodeExample>,
    pub usage_guide: String,
    pub architecture: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct APIDoc {
    pub name: String,
    pub signature: String,
    pub description: String,
    pub parameters: Vec<ParameterDoc>,
    pub return_type: String,
    pub return_description: String,
    pub examples: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterDoc {
    pub name: String,
    pub r#type: String,
    pub description: String,
    pub required: bool,
    pub default: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeExample {
    pub title: String,
    pub description: String,
    pub code: String,
    pub language: String,
}

pub struct DocGenerator {
    router: Arc<ModelRouter>,
}

impl DocGenerator {
    pub fn new(router: Arc<ModelRouter>) -> Self {
        Self { router }
    }
    
    /// Generate documentation for code
    pub async fn generate_docs(
        &self,
        code: &str,
        language: &str,
        file_path: &str,
    ) -> Result<Documentation, String> {
        let prompt = format!(
            r#"Generate comprehensive documentation for the following {} code.

File: {}
Code:
```{}
{}
```

Generate:
1. Overview/description
2. API reference with parameters, return types, examples
3. Usage examples
4. Architecture explanation
5. Best practices and patterns used"#,
            language,
            file_path,
            language,
            code
        );
        
        // Use AI to generate documentation
        use crate::types::{AIMessage, MessageRole, AIRequest, ModelProvider};
        
        let messages = vec![AIMessage {
            role: MessageRole::User,
            content: prompt,
        }];
        
        let request = AIRequest {
            messages,
            model: None,
            temperature: Some(0.5),
            max_tokens: Some(4000),
            stream: Some(false),
        };
        
        // Use Claude for documentation (best quality)
        let service = self.router.get_service(ModelProvider::Anthropic)
            .or_else(|| self.router.get_service(ModelProvider::OpenAI))
            .ok_or("No AI service available")?;
        
        match service.generate(request).await {
            Ok(response) => {
                // Parse documentation from response
                Ok(parse_documentation(&response.content, code, language))
            }
            Err(e) => Err(format!("Documentation generation failed: {}", e)),
        }
    }
}
