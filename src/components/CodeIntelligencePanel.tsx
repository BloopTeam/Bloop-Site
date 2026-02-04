/**
 * Code Intelligence Panel
 * 
 * User-specific code analysis - only active when user is working
 * All data is stored per-user in database (not shared)
 */
import React, { useState, useEffect } from 'react'
import { Search, GitBranch, FileCode, AlertTriangle, CheckCircle, Hash, FileText, Layers, RefreshCw, Brain } from 'lucide-react'
import { userSessionService } from '../services/userSession'

interface Symbol {
  name: string
  kind: string
  file_path: string
  line: number
  column: number
  signature?: string
  references?: number
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
  const [isActive, setIsActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Symbol[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null)
  const [references, setReferences] = useState<Reference[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [dependencies, setDependencies] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Only activate when user starts working (user-specific check)
  useEffect(() => {
    const userId = userSessionService.getCurrentUserId()
    const hasActiveProject = userId
      ? sessionStorage.getItem(`bloop-has-project-${userId}`) === 'true' || localStorage.getItem('bloop-has-project') === 'true'
      : localStorage.getItem('bloop-has-project') === 'true'
    
    if (hasActiveProject) {
      setIsActive(true)
      loadCodeData()
    } else {
      setIsActive(false)
      setSearchResults([])
      setReferences([])
      setPatterns([])
      setDependencies([])
    }
  }, [])

  // Listen for project activity
  useEffect(() => {
    const handleProjectActivity = () => {
      if (!isActive) {
        setIsActive(true)
        loadCodeData()
      }
    }

    window.addEventListener('bloop:project-activity', handleProjectActivity)
    return () => window.removeEventListener('bloop:project-activity', handleProjectActivity)
  }, [isActive])

  const loadCodeData = async () => {
    if (!isActive) return
    
    setLoading(true)
    try {
      // TODO: Replace with actual API call to user-specific database
      // const userId = getCurrentUserId()
      // const data = await apiService.getUserCodeIntelligence(userId)
      
      // For now, simulate user-specific data (empty by default)
      setSearchResults([])
      setReferences([])
      setPatterns([])
      setDependencies([])
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !isActive) return
    
    setLoading(true)
    try {
      // TODO: Search user's codebase from their database
      // const userId = getCurrentUserId()
      // const results = await apiService.searchUserCodebase(userId, searchQuery)
      
      // Simulate search
      setSearchResults([])
    } catch {
      // Search unavailable
    } finally {
      setLoading(false)
    }
  }

  const handleSymbolClick = async (symbol: Symbol) => {
    setSelectedSymbol(symbol)
    try {
      // TODO: Get references from user's database
      // const userId = getCurrentUserId()
      // const refs = await apiService.getSymbolReferences(userId, symbol.name)
      setReferences([])
    } catch {
      // References unavailable
    }
  }

  const getSymbolIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'function':
      case 'method':
        return <Hash size={14} style={{ color: '#FF00FF' }} />
      case 'class':
      case 'struct':
        return <FileCode size={14} style={{ color: '#3b82f6' }} />
      case 'interface':
      case 'trait':
        return <Layers size={14} style={{ color: '#a855f7' }} />
      default:
        return <FileText size={14} style={{ color: '#858585' }} />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'error':
        return '#ef4444'
      case 'warning':
        return '#eab308'
      case 'info':
        return '#3b82f6'
      default:
        return '#858585'
    }
  }

  // Empty state - user not working yet
  if (!isActive) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        background: '#252526', 
        color: '#cccccc',
        fontSize: '13px'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '12px', 
          borderBottom: '1px solid #3e3e42',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={16} style={{ color: '#FF00FF' }} />
            <span style={{ fontWeight: 600 }}>Code Intelligence</span>
          </div>
        </div>

        {/* Empty State */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          textAlign: 'center'
        }}>
          <Brain size={48} style={{ color: '#3e3e42', marginBottom: '16px', opacity: 0.5 }} />
          <div style={{ fontSize: '13px', color: '#858585', marginBottom: '8px' }}>
            Code intelligence will begin when you start working
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            Open a project or create a file to start
          </div>
        </div>
      </div>
    )
  }

  // Active state
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      background: '#252526', 
      color: '#cccccc',
      fontSize: '13px'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px', 
        borderBottom: '1px solid #3e3e42',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={16} style={{ color: '#FF00FF' }} />
            <span style={{ fontWeight: 600 }}>Code Intelligence</span>
          </div>
          <button
            onClick={loadCodeData}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#858585',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
              transition: 'all 0.2s',
              opacity: loading ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.color = '#FF00FF'
                e.currentTarget.style.background = 'rgba(255, 0, 255, 0.1)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.color = '#858585'
                e.currentTarget.style.background = 'transparent'
              }
            }}
            title="Refresh analysis"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ 
              position: 'absolute', 
              left: '10px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#858585'
            }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search symbols..."
              style={{ 
                width: '100%',
                paddingLeft: '32px',
                paddingRight: '8px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '12px',
                background: '#1e1e1e', 
                border: '1px solid #3e3e42',
                borderRadius: '4px',
                color: '#ccc',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#FF00FF'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#3e3e42'}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !isActive}
            style={{ 
              padding: '6px 12px',
              fontSize: '12px',
              background: '#FF00FF',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !isActive ? 'not-allowed' : 'pointer',
              opacity: loading || !isActive ? 0.5 : 1,
              fontWeight: 500
            }}
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '32px', 
            color: '#858585',
            fontSize: '13px'
          }}>
            Analyzing code...
          </div>
        ) : searchResults.length === 0 && references.length === 0 && patterns.length === 0 && dependencies.length === 0 ? (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            textAlign: 'center'
          }}>
            <Brain size={48} style={{ color: '#3e3e42', marginBottom: '16px', opacity: 0.5 }} />
            <div style={{ fontSize: '13px', color: '#858585', marginBottom: '8px' }}>
              {searchQuery ? 'No symbols found' : 'Start analyzing your code'}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {searchQuery ? 'Try a different search term' : 'Search for symbols or wait for automatic analysis'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#858585', marginBottom: '8px', fontWeight: 600 }}>
                  Symbols ({searchResults.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {searchResults.map((symbol, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSymbolClick(symbol)}
                      style={{ 
                        padding: '8px',
                        background: selectedSymbol?.name === symbol.name ? 'rgba(255, 0, 255, 0.08)' : 'transparent',
                        border: selectedSymbol?.name === symbol.name ? '1px solid #FF00FF' : '1px solid transparent',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedSymbol?.name !== symbol.name) {
                          e.currentTarget.style.background = '#1e1e1e'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedSymbol?.name !== symbol.name) {
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getSymbolIcon(symbol.kind)}
                        <span style={{ fontWeight: 500, color: '#ccc' }}>{symbol.name}</span>
                        <span style={{ fontSize: '10px', color: '#666' }}>{symbol.kind}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                        {symbol.file_path}:{symbol.line}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* References */}
            {references.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#858585', marginBottom: '8px', fontWeight: 600 }}>
                  References ({references.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {references.map((ref, idx) => (
                    <div
                      key={idx}
                      onClick={() => onNavigateToFile?.(ref.from_file, ref.from_location.start_line, ref.from_location.start_column)}
                      style={{ 
                        padding: '8px',
                        background: 'transparent',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#1e1e1e'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GitBranch size={12} style={{ color: '#858585' }} />
                        <span style={{ color: '#ccc' }}>{ref.reference_type}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                        {ref.from_file}:{ref.from_location.start_line}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patterns */}
            {patterns.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#858585', marginBottom: '8px', fontWeight: 600 }}>
                  Patterns ({patterns.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {patterns.map((pattern, idx) => (
                    <div
                      key={idx}
                      style={{ 
                        padding: '8px',
                        background: '#1e1e1e',
                        border: `1px solid ${getSeverityColor(pattern.severity)}`,
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {pattern.severity === 'error' || pattern.severity === 'critical' ? (
                          <AlertTriangle size={12} style={{ color: getSeverityColor(pattern.severity) }} />
                        ) : (
                          <CheckCircle size={12} style={{ color: getSeverityColor(pattern.severity) }} />
                        )}
                        <span style={{ fontWeight: 500, color: '#ccc' }}>{pattern.name}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#858585' }}>
                        {pattern.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
