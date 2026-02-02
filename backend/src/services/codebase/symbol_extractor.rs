/**
 * Symbol Extractor
 * 
 * Extracts symbols (functions, classes, imports, etc.) from code
 * Uses AST parser for accurate extraction
 */
use super::indexer::{CodeSymbol, SymbolKind as IndexerSymbolKind};
use super::ast_parser::{ASTParser, ParsedSymbol, SymbolKind};
use super::reference_tracker::ReferenceTracker;
use std::sync::Arc;

pub struct SymbolExtractor {
    parser: ASTParser,
    reference_tracker: Arc<ReferenceTracker>,
}

impl SymbolExtractor {
    pub fn new(reference_tracker: Arc<ReferenceTracker>) -> Self {
        Self {
            parser: ASTParser::new(),
            reference_tracker,
        }
    }

    /// Extract all symbols from code
    pub async fn extract(&mut self, code: &str, language: &str, file_path: &str) -> Vec<CodeSymbol> {
        let parsed_symbols = self.parser.extract_symbols(code, language);
        
        parsed_symbols.into_iter()
            .map(|ps| {
                // Register definition with reference tracker
                let code_symbol = self.parsed_to_code_symbol(&ps, file_path);
                let location = ps.location.clone();
                let symbol_name = ps.name.clone();
                
                // Register asynchronously
                let rt = Arc::clone(&self.reference_tracker);
                let cs = code_symbol.clone();
                tokio::spawn(async move {
                    rt.register_definition(cs, file_path.to_string(), location).await;
                });
                
                code_symbol
            })
            .collect()
    }

    /// Extract imports from code
    pub async fn extract_imports(&mut self, code: &str, language: &str, file_path: &str) -> Vec<String> {
        let imports = self.parser.extract_imports(code, language);
        
        // Register import references
        for import in &imports {
            let rt = Arc::clone(&self.reference_tracker);
            let import_path = import.path.clone();
            let location = import.location.clone();
            let file = file_path.to_string();
            
            tokio::spawn(async move {
                rt.register_reference(
                    file,
                    location,
                    import_path,
                    super::reference_tracker::ReferenceType::Import,
                    "import".to_string(),
                ).await;
            });
        }
        
        imports.into_iter().map(|i| i.path).collect()
    }

    fn parsed_to_code_symbol(&self, parsed: &ParsedSymbol, file_path: &str) -> CodeSymbol {
        CodeSymbol {
            name: parsed.name.clone(),
            kind: self.convert_symbol_kind(&parsed.kind),
            file_path: file_path.to_string(),
            line: parsed.location.start_line,
            column: parsed.location.start_column,
            signature: parsed.signature.clone(),
            documentation: parsed.documentation.clone(),
            references: vec![], // Will be populated by reference tracker
        }
    }

    fn convert_symbol_kind(&self, kind: &SymbolKind) -> IndexerSymbolKind {
        match kind {
            SymbolKind::Function | SymbolKind::Method => IndexerSymbolKind::Function,
            SymbolKind::Class => IndexerSymbolKind::Class,
            SymbolKind::Struct => IndexerSymbolKind::Struct,
            SymbolKind::Interface => IndexerSymbolKind::Interface,
            SymbolKind::Type => IndexerSymbolKind::Type,
            SymbolKind::Variable => IndexerSymbolKind::Variable,
            SymbolKind::Constant => IndexerSymbolKind::Constant,
            SymbolKind::Module => IndexerSymbolKind::Module,
            SymbolKind::Import => IndexerSymbolKind::Import,
            SymbolKind::Export => IndexerSymbolKind::Export,
            SymbolKind::Enum => IndexerSymbolKind::Type, // Map enum to type
            SymbolKind::Trait => IndexerSymbolKind::Interface, // Map trait to interface
            SymbolKind::Property => IndexerSymbolKind::Variable,
        }
    }
}
