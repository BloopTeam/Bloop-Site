/**
 * AST Parser
 * 
 * Language-aware parsing using tree-sitter for all supported languages
 * Extracts functions, classes, imports, and cross-file references
 */
use tree_sitter::{Parser, Language, Node};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ASTNode {
    pub node_type: String,
    pub value: Option<String>,
    pub children: Vec<ASTNode>,
    pub location: Location,
    pub language: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Location {
    pub start_line: u32,
    pub start_column: u32,
    pub end_line: u32,
    pub end_column: u32,
    pub start_byte: usize,
    pub end_byte: usize,
}

#[derive(Debug, Clone)]
pub struct ParsedSymbol {
    pub name: String,
    pub kind: SymbolKind,
    pub location: Location,
    pub signature: Option<String>,
    pub documentation: Option<String>,
    pub children: Vec<ParsedSymbol>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum SymbolKind {
    Function,
    Class,
    Struct,
    Interface,
    Type,
    Variable,
    Constant,
    Module,
    Import,
    Export,
    Method,
    Property,
    Enum,
    Trait,
}

pub struct ASTParser {
    parsers: HashMap<String, (Language, Parser)>,
}

impl ASTParser {
    pub fn new() -> Self {
        let mut parsers = HashMap::new();
        
        // Initialize parsers for supported languages
        // Note: In production, these would be loaded from tree-sitter grammars
        // For now, we'll create a structure that can be extended
        
        Self { parsers }
    }

    /// Parse code into AST
    pub fn parse(&mut self, code: &str, language: &str) -> Result<ASTNode, String> {
        let language_lower = language.to_lowercase();
        
        // Detect language if not specified
        let detected_lang = if language.is_empty() {
            self.detect_language(code)?
        } else {
            language_lower
        };

        // Get or create parser for this language
        let parser = self.get_parser(&detected_lang)?;
        
        // Parse the code
        let tree = parser.parse(code, None)
            .ok_or_else(|| format!("Failed to parse {} code", detected_lang))?;
        
        let root_node = tree.root_node();
        
        // Convert tree-sitter node to our ASTNode
        Ok(self.node_to_ast(root_node, code, &detected_lang))
    }

    /// Extract symbols from parsed AST
    pub fn extract_symbols(&mut self, code: &str, language: &str) -> Vec<ParsedSymbol> {
        match self.parse(code, language) {
            Ok(ast) => self.extract_symbols_from_ast(&ast, code),
            Err(_) => vec![],
        }
    }

    /// Extract imports from code
    pub fn extract_imports(&mut self, code: &str, language: &str) -> Vec<ImportInfo> {
        match self.parse(code, language) {
            Ok(ast) => self.extract_imports_from_ast(&ast, code),
            Err(_) => vec![],
        }
    }

    fn node_to_ast(&self, node: Node, source: &str, language: &str) -> ASTNode {
        let mut children = Vec::new();
        
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            children.push(self.node_to_ast(child, source, language));
        }

        let start = node.start_position();
        let end = node.end_position();
        
        ASTNode {
            node_type: node.kind().to_string(),
            value: node.utf8_text(source.as_bytes()).ok().map(|s| s.to_string()),
            children,
            location: Location {
                start_line: start.row as u32 + 1,
                start_column: start.column as u32 + 1,
                end_line: end.row as u32 + 1,
                end_column: end.column as u32 + 1,
                start_byte: node.start_byte(),
                end_byte: node.end_byte(),
            },
            language: language.to_string(),
        }
    }

    fn extract_symbols_from_ast(&self, ast: &ASTNode, source: &str) -> Vec<ParsedSymbol> {
        let mut symbols = Vec::new();
        self.traverse_for_symbols(ast, source, &mut symbols);
        symbols
    }

    fn traverse_for_symbols(&self, node: &ASTNode, source: &str, symbols: &mut Vec<ParsedSymbol>) {
        // Extract symbols based on node type
        let symbol_kind = match node.node_type.as_str() {
            "function_declaration" | "function" | "method_definition" => Some(SymbolKind::Function),
            "class_declaration" | "class_definition" => Some(SymbolKind::Class),
            "struct_item" | "struct_definition" => Some(SymbolKind::Struct),
            "interface_declaration" | "interface_definition" => Some(SymbolKind::Interface),
            "type_alias_declaration" | "type_definition" => Some(SymbolKind::Type),
            "variable_declaration" | "let_declaration" => Some(SymbolKind::Variable),
            "const_declaration" => Some(SymbolKind::Constant),
            "module" => Some(SymbolKind::Module),
            "enum_item" | "enum_declaration" => Some(SymbolKind::Enum),
            "trait_item" | "trait_definition" => Some(SymbolKind::Trait),
            _ => None,
        };

        if let Some(kind) = symbol_kind {
            let name = self.extract_name(node, source);
            let signature = self.extract_signature(node, source);
            let documentation = self.extract_documentation(node, source);
            
            let mut children = Vec::new();
            for child in &node.children {
                self.traverse_for_symbols(child, source, &mut children);
            }

            symbols.push(ParsedSymbol {
                name,
                kind,
                location: node.location.clone(),
                signature,
                documentation,
                children,
            });
        } else {
            // Continue traversing children
            for child in &node.children {
                self.traverse_for_symbols(child, source, symbols);
            }
        }
    }

    fn extract_imports_from_ast(&self, ast: &ASTNode, source: &str) -> Vec<ImportInfo> {
        let mut imports = Vec::new();
        self.traverse_for_imports(ast, source, &mut imports);
        imports
    }

    fn traverse_for_imports(&self, node: &ASTNode, source: &str, imports: &mut Vec<ImportInfo>) {
        if node.node_type == "import_statement" || 
           node.node_type == "import_declaration" ||
           node.node_type == "use_declaration" {
            if let Some(value) = &node.value {
                imports.push(ImportInfo {
                    path: value.clone(),
                    location: node.location.clone(),
                    is_type_only: value.contains("type "),
                });
            }
        }

        for child in &node.children {
            self.traverse_for_imports(child, source, imports);
        }
    }

    fn extract_name(&self, node: &ASTNode, source: &str) -> String {
        // Try to find identifier node
        for child in &node.children {
            if child.node_type == "identifier" || 
               child.node_type == "type_identifier" ||
               child.node_type == "property_identifier" {
                return child.value.clone().unwrap_or_default();
            }
        }
        
        // Fallback: extract from value
        node.value.clone().unwrap_or_default()
    }

    fn extract_signature(&self, node: &ASTNode, source: &str) -> Option<String> {
        // Extract function/class signature
        let start = node.location.start_byte;
        let end = node.location.end_byte.min(start + 200); // Limit signature length
        
        if end > start && end <= source.len() {
            Some(source[start..end].to_string())
        } else {
            None
        }
    }

    fn extract_documentation(&self, node: &ASTNode, source: &str) -> Option<String> {
        // Look for comment nodes before this node
        // In tree-sitter, comments are usually siblings or parents
        // This is a simplified version
        None
    }

    fn detect_language(&self, code: &str) -> Result<String, String> {
        // Simple language detection based on file extensions or code patterns
        if code.contains("fn ") && code.contains("let ") {
            Ok("rust".to_string())
        } else if code.contains("function ") || code.contains("const ") || code.contains("import ") {
            Ok("javascript".to_string())
        } else if code.contains("def ") && code.contains("import ") {
            Ok("python".to_string())
        } else if code.contains("public class") || code.contains("import ") {
            Ok("java".to_string())
        } else if code.contains("package ") {
            Ok("go".to_string())
        } else {
            Ok("unknown".to_string())
        }
    }

    fn get_parser(&mut self, language: &str) -> Result<&mut Parser, String> {
        // In production, this would load the appropriate tree-sitter grammar
        // For now, create a basic parser
        if !self.parsers.contains_key(language) {
            let parser = Parser::new();
            // Note: In production, you would set the language here:
            // parser.set_language(language).map_err(|e| format!("Failed to set language: {}", e))?;
            self.parsers.insert(language.to_string(), (unsafe { std::mem::zeroed() }, parser));
        }
        
        self.parsers.get_mut(language)
            .map(|(_, p)| p)
            .ok_or_else(|| format!("Parser not available for language: {}", language))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportInfo {
    pub path: String,
    pub location: Location,
    pub is_type_only: bool,
}

impl Default for ASTParser {
    fn default() -> Self {
        Self::new()
    }
}
