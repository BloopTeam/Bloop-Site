/**
 * Cross-File Reference Tracker
 * 
 * Tracks references between files, symbols, and modules
 * Enables "find usages", "go to definition", and impact analysis
 */
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Serialize, Deserialize};
use super::ast_parser::{Location, ParsedSymbol};
use super::indexer::CodeSymbol;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reference {
    pub from_file: String,
    pub from_location: Location,
    pub to_file: String,
    pub to_symbol: String,
    pub reference_type: ReferenceType,
    pub context: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ReferenceType {
    Import,
    Call,
    Extends,
    Implements,
    Uses,
    References,
    Exports,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolDefinition {
    pub symbol: CodeSymbol,
    pub file_path: String,
    pub location: Location,
    pub references: Vec<Reference>,
}

pub struct ReferenceTracker {
    definitions: Arc<RwLock<HashMap<String, Vec<SymbolDefinition>>>>, // symbol_name -> definitions
    references: Arc<RwLock<HashMap<String, Vec<Reference>>>>, // file_path -> references
    file_to_symbols: Arc<RwLock<HashMap<String, Vec<String>>>>, // file_path -> symbol_names
}

impl ReferenceTracker {
    pub fn new() -> Self {
        Self {
            definitions: Arc::new(RwLock::new(HashMap::new())),
            references: Arc::new(RwLock::new(HashMap::new())),
            file_to_symbols: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register a symbol definition
    pub async fn register_definition(&self, symbol: CodeSymbol, file_path: String, location: Location) {
        let mut definitions = self.definitions.write().await;
        let symbol_name = symbol.name.clone();
        
        let definition = SymbolDefinition {
            symbol: symbol.clone(),
            file_path: file_path.clone(),
            location,
            references: Vec::new(),
        };

        definitions.entry(symbol_name.clone())
            .or_insert_with(Vec::new)
            .push(definition);

        // Track file -> symbols mapping
        let mut file_to_symbols = self.file_to_symbols.write().await;
        file_to_symbols.entry(file_path)
            .or_insert_with(Vec::new)
            .push(symbol_name);
    }

    /// Register a reference to a symbol
    pub async fn register_reference(
        &self,
        from_file: String,
        from_location: Location,
        to_symbol: String,
        reference_type: ReferenceType,
        context: String,
    ) {
        // Try to find the definition
        let definitions = self.definitions.read().await;
        let to_file = definitions.get(&to_symbol)
            .and_then(|defs| defs.first())
            .map(|d| d.file_path.clone())
            .unwrap_or_else(|| "unknown".to_string());

        let reference = Reference {
            from_file: from_file.clone(),
            from_location,
            to_file,
            to_symbol: to_symbol.clone(),
            reference_type,
            context,
        };

        let mut references = self.references.write().await;
        references.entry(from_file)
            .or_insert_with(Vec::new)
            .push(reference);
    }

    /// Find all usages of a symbol
    pub async fn find_usages(&self, symbol_name: &str) -> Vec<Reference> {
        let references = self.references.read().await;
        let mut usages = Vec::new();

        for (_, refs) in references.iter() {
            for reference in refs {
                if reference.to_symbol == symbol_name {
                    usages.push(reference.clone());
                }
            }
        }

        usages
    }

    /// Find definition of a symbol
    pub async fn find_definition(&self, symbol_name: &str) -> Option<SymbolDefinition> {
        let definitions = self.definitions.read().await;
        definitions.get(symbol_name)
            .and_then(|defs| defs.first())
            .cloned()
    }

    /// Get all references from a file
    pub async fn get_file_references(&self, file_path: &str) -> Vec<Reference> {
        let references = self.references.read().await;
        references.get(file_path)
            .cloned()
            .unwrap_or_default()
    }

    /// Get all files that reference a symbol
    pub async fn get_referencing_files(&self, symbol_name: &str) -> HashSet<String> {
        let references = self.references.read().await;
        let mut files = HashSet::new();

        for (file_path, refs) in references.iter() {
            for reference in refs {
                if reference.to_symbol == symbol_name {
                    files.insert(file_path.clone());
                }
            }
        }

        files
    }

    /// Get impact analysis: what would break if this symbol is changed
    pub async fn get_impact_analysis(&self, symbol_name: &str) -> ImpactAnalysis {
        let usages = self.find_usages(symbol_name).await;
        let referencing_files = self.get_referencing_files(symbol_name).await;

        ImpactAnalysis {
            symbol: symbol_name.to_string(),
            total_usages: usages.len(),
            referencing_files: referencing_files.len(),
            files: referencing_files.into_iter().collect(),
            usages,
        }
    }

    /// Remove all references for a file (when file is deleted)
    pub async fn remove_file(&self, file_path: &str) {
        let mut references = self.references.write().await;
        references.remove(file_path);

        // Remove symbols from file_to_symbols
        let mut file_to_symbols = self.file_to_symbols.write().await;
        if let Some(symbols) = file_to_symbols.remove(file_path) {
            // Remove definitions for these symbols
            let mut definitions = self.definitions.write().await;
            for symbol_name in symbols {
                if let Some(defs) = definitions.get_mut(&symbol_name) {
                    defs.retain(|d| d.file_path != file_path);
                    if defs.is_empty() {
                        definitions.remove(&symbol_name);
                    }
                }
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImpactAnalysis {
    pub symbol: String,
    pub total_usages: usize,
    pub referencing_files: usize,
    pub files: Vec<String>,
    pub usages: Vec<Reference>,
}

impl Default for ReferenceTracker {
    fn default() -> Self {
        Self::new()
    }
}
