/**
 * Codebase Analysis Engine
 * 
 * Provides codebase-wide understanding, indexing, and analysis
 * Better than Claude/Cursor/Kimi with:
 * - AST parsing for all languages
 * - Symbol extraction and indexing
 * - Cross-file dependency analysis
 * - Semantic code search
 * - Code review automation
 * - Test generation
 * - Documentation generation
 * - Performance analysis
 */
pub mod indexer;
pub mod ast_parser;
pub mod symbol_extractor;
pub mod dependency_analyzer;
pub mod semantic_search;
pub mod code_reviewer;
pub mod test_generator;
pub mod doc_generator;
pub mod performance_analyzer;
pub mod refactoring_suggestions;
pub mod pattern_detector;
pub mod reference_tracker;
pub mod enhanced_parser;
pub mod performance;

pub use indexer::CodebaseIndexer;
pub use ast_parser::{ASTParser, ParsedSymbol, SymbolKind};
pub use symbol_extractor::SymbolExtractor;
pub use dependency_analyzer::DependencyAnalyzer;
pub use semantic_search::SemanticSearch;
pub use code_reviewer::CodeReviewer;
pub use test_generator::TestGenerator;
pub use doc_generator::DocGenerator;
pub use performance_analyzer::PerformanceAnalyzer;
pub use refactoring_suggestions::RefactoringSuggestions;
pub use pattern_detector::{PatternDetector, DetectedPattern, PatternType, PatternSeverity};
pub use reference_tracker::ReferenceTracker;
