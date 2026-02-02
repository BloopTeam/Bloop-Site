/**
 * Code Intelligence Panel
 * 
 * Displays code intelligence features:
 * - Symbol search and navigation
 * - Reference tracking (find usages, go to definition)
 * - Dependency graph visualization
 * - Pattern detection results
 * - Semantic search
 */
import React, { useState, useEffect } from 'react'
import { Search, GitBranch, FileCode, AlertTriangle, CheckCircle, X, ChevronRight, Hash, FileText, Layers } from 'lucide-react'
import { apiService } from '../services/api'

interface Symbol {
  name: string
  kind: string
  file_path: string
  line: number
  column: number
  signature?: string
  documentation?: string
}

interface Reference {
  from_file: string
  from_location: { start_line: number; start_column: number }
  to_file: string
  to_symbol: string
  reference_type: string
}

interface Pattern {
  pattern_type: string
  name: string
  description: string
  location: { start_line: number; start_column: number }
  confidence: number
  severity: string
  suggestion?: string
}

interface CodeIntelligencePanelProps {
  onNavigateToFile?: (filePath: string, line: number, column: number) => void
}

export function CodeIntelligencePanel({ onNavigateToFile }: CodeIntelligencePanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Symbol[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null)
  const [references, setReferences] = useState<Reference[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [dependencies, setDependencies] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'search' | 'references' | 'dependencies' | 'patterns'>('search')
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    try {
      const results = await apiService.searchCodebase(searchQuery)
      setSearchResults(results)
      setActiveTab('search')
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSymbolClick = async (symbol: Symbol) => {
    setSelectedSymbol(symbol)
    setActiveTab('references')
    
    try {
      const refs = await apiService.findSymbolUsages(symbol.name)
      setReferences(refs)
    } catch (error) {
      console.error('Failed to find usages:', error)
    }
  }

  const handleFileClick = async (filePath: string) => {
    try {
      const deps = await apiService.getFileDependencies(filePath)
      setDependencies(deps)
      setActiveTab('dependencies')
    } catch (error) {
      console.error('Failed to get dependencies:', error)
    }
  }

  useEffect(() => {
    // Load patterns for current file if available
    const loadPatterns = async () => {
      try {
        const pats = await apiService.detectPatterns('current-file.ts')
        setPatterns(pats)
      } catch (error) {
        // Silently fail if patterns not available
      }
    }
    loadPatterns()
  }, [])

  const getSymbolIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'function':
      case 'method':
        return <Hash size={14} />
      case 'class':
      case 'struct':
        return <FileCode size={14} />
      case 'interface':
      case 'trait':
        return <Layers size={14} />
      default:
        return <FileText size={14} />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'error':
        return '#ff4444'
      case 'warning':
        return '#ffaa00'
      case 'info':
        return '#4488ff'
      default:
        return '#888888'
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#1e1e1e', color: '#cccccc' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: '#3e3e42' }}>
        <div className="text-sm font-medium mb-2">Code Intelligence</div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2" style={{ color: '#858585' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search symbols..."
              className="w-full pl-8 pr-2 py-1 text-sm rounded"
              style={{ 
                backgroundColor: '#252526', 
                border: '1px solid #3e3e42',
                color: '#cccccc'
              }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-3 py-1 text-sm rounded"
            style={{ 
              backgroundColor: '#007acc',
              color: '#ffffff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: '#3e3e42' }}>
        {[
          { id: 'search' as const, label: 'Search', count: searchResults.length },
          { id: 'references' as const, label: 'References', count: references.length },
          { id: 'dependencies' as const, label: 'Dependencies', count: dependencies.length },
          { id: 'patterns' as const, label: 'Patterns', count: patterns.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-xs font-medium relative"
            style={{
              color: activeTab === tab.id ? '#ffffff' : '#858585',
              backgroundColor: activeTab === tab.id ? '#2d2d30' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #007acc' : 'none',
              cursor: 'pointer'
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#3e3e42' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'search' && (
          <div className="space-y-2">
            {searchResults.length === 0 ? (
              <div className="text-sm text-center py-8" style={{ color: '#858585' }}>
                {searchQuery ? 'No results found' : 'Enter a search query to find symbols'}
              </div>
            ) : (
              searchResults.map((symbol, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSymbolClick(symbol)}
                  className="p-2 rounded cursor-pointer hover:bg-opacity-50"
                  style={{ 
                    backgroundColor: selectedSymbol?.name === symbol.name ? '#2d2d30' : 'transparent',
                    ':hover': { backgroundColor: '#2d2d30' }
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d2d30'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedSymbol?.name === symbol.name ? '#2d2d30' : 'transparent'}
                >
                  <div className="flex items-center gap-2">
                    {getSymbolIcon(symbol.kind)}
                    <span className="text-sm font-medium">{symbol.name}</span>
                    <span className="text-xs" style={{ color: '#858585' }}>{symbol.kind}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#858585' }}>
                    {symbol.file_path}:{symbol.line}
                  </div>
                  {symbol.signature && (
                    <div className="text-xs mt-1 font-mono" style={{ color: '#858585' }}>
                      {symbol.signature}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'references' && (
          <div className="space-y-2">
            {selectedSymbol && (
              <div className="mb-4 p-2 rounded" style={{ backgroundColor: '#2d2d30' }}>
                <div className="text-sm font-medium">{selectedSymbol.name}</div>
                <div className="text-xs mt-1" style={{ color: '#858585' }}>
                  {selectedSymbol.file_path}:{selectedSymbol.line}:{selectedSymbol.column}
                </div>
              </div>
            )}
            {references.length === 0 ? (
              <div className="text-sm text-center py-8" style={{ color: '#858585' }}>
                {selectedSymbol ? 'No references found' : 'Select a symbol to see references'}
              </div>
            ) : (
              references.map((ref, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigateToFile?.(ref.from_file, ref.from_location.start_line, ref.from_location.start_column)}
                  className="p-2 rounded cursor-pointer hover:bg-opacity-50"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d2d30'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="flex items-center gap-2">
                    <GitBranch size={14} style={{ color: '#858585' }} />
                    <span className="text-sm">{ref.reference_type}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#858585' }}>
                    {ref.from_file}:{ref.from_location.start_line}:{ref.from_location.start_column}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'dependencies' && (
          <div className="space-y-2">
            {dependencies.length === 0 ? (
              <div className="text-sm text-center py-8" style={{ color: '#858585' }}>
                Click on a file to see its dependencies
              </div>
            ) : (
              dependencies.map((dep, idx) => (
                <div
                  key={idx}
                  onClick={() => handleFileClick(dep)}
                  className="p-2 rounded cursor-pointer hover:bg-opacity-50"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d2d30'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="flex items-center gap-2">
                    <FileCode size={14} style={{ color: '#858585' }} />
                    <span className="text-sm">{dep}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="space-y-2">
            {patterns.length === 0 ? (
              <div className="text-sm text-center py-8" style={{ color: '#858585' }}>
                No patterns detected
              </div>
            ) : (
              patterns.map((pattern, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded border"
                  style={{ 
                    backgroundColor: '#252526',
                    borderColor: getSeverityColor(pattern.severity)
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {pattern.severity === 'error' || pattern.severity === 'critical' ? (
                      <AlertTriangle size={14} style={{ color: getSeverityColor(pattern.severity) }} />
                    ) : (
                      <CheckCircle size={14} style={{ color: getSeverityColor(pattern.severity) }} />
                    )}
                    <span className="text-sm font-medium">{pattern.name}</span>
                    <span className="text-xs ml-auto" style={{ color: '#858585' }}>
                      {Math.round(pattern.confidence * 100)}%
                    </span>
                  </div>
                  <div className="text-xs mb-2" style={{ color: '#858585' }}>
                    {pattern.description}
                  </div>
                  {pattern.suggestion && (
                    <div className="text-xs mt-2 p-2 rounded" style={{ backgroundColor: '#1e1e1e' }}>
                      <strong>Suggestion:</strong> {pattern.suggestion}
                    </div>
                  )}
                  <div className="text-xs mt-2" style={{ color: '#858585' }}>
                    Line {pattern.location.start_line}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
