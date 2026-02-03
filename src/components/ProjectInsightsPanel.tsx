/**
 * Project Insights Panel
 * Architecture visualization, tech debt, and project analysis
 */

import { useState, useEffect } from 'react'
import { 
  Layout, AlertTriangle, GitBranch, FileCode, Package,
  RefreshCw, ChevronRight, X, Layers, BarChart2,
  Clock, Shield, FileText, Zap, CheckCircle, XCircle
} from 'lucide-react'
import { 
  projectContextService, 
  ProjectContext, 
  TechDebtItem, 
  ComponentInfo,
  ArchitectureLayer,
  RefactoringOpportunity
} from '../services/projectContext'

interface ProjectInsightsPanelProps {
  onClose: () => void
}

type ViewMode = 'overview' | 'architecture' | 'debt' | 'refactoring'

export default function ProjectInsightsPanel({ onClose }: ProjectInsightsPanelProps) {
  const [context, setContext] = useState<ProjectContext | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('overview')

  useEffect(() => {
    setContext(projectContextService.getContext())
  }, [])

  const analyzeProject = async () => {
    setAnalyzing(true)
    const ctx = await projectContextService.analyzeProject('/current-project')
    setContext(ctx)
    setAnalyzing(false)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444'
      case 'high': return '#f97316'
      case 'medium': return '#eab308'
      case 'low': return '#22c55e'
      default: return '#666'
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'high': return '#ef4444'
      case 'medium': return '#eab308'
      case 'low': return '#22c55e'
      default: return '#666'
    }
  }

  const renderOverview = () => {
    if (!context) return null
    const { metrics } = context

    return (
      <div>
        {/* Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            padding: '16px',
            background: '#141414',
            borderRadius: '10px',
            border: '1px solid #1a1a1a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FileCode size={16} style={{ color: '#3b82f6' }} />
              <span style={{ fontSize: '11px', color: '#666' }}>FILES</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#fff' }}>
              {metrics.totalFiles}
            </div>
            <div style={{ fontSize: '11px', color: '#555' }}>
              {metrics.totalLines.toLocaleString()} lines
            </div>
          </div>

          <div style={{
            padding: '16px',
            background: '#141414',
            borderRadius: '10px',
            border: '1px solid #1a1a1a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Shield size={16} style={{ color: '#22c55e' }} />
              <span style={{ fontSize: '11px', color: '#666' }}>TEST COVERAGE</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: metrics.testCoverage > 60 ? '#22c55e' : '#eab308' }}>
              {metrics.testCoverage}%
            </div>
            <div style={{ fontSize: '11px', color: '#555' }}>
              of code covered
            </div>
          </div>

          <div style={{
            padding: '16px',
            background: '#141414',
            borderRadius: '10px',
            border: '1px solid #1a1a1a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FileText size={16} style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: '11px', color: '#666' }}>DOCUMENTATION</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: metrics.documentationScore > 70 ? '#22c55e' : '#eab308' }}>
              {metrics.documentationScore}%
            </div>
            <div style={{ fontSize: '11px', color: '#555' }}>
              documented
            </div>
          </div>

          <div style={{
            padding: '16px',
            background: '#141414',
            borderRadius: '10px',
            border: '1px solid #1a1a1a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Zap size={16} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '11px', color: '#666' }}>MAINTAINABILITY</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: metrics.maintainabilityIndex > 65 ? '#22c55e' : '#eab308' }}>
              {metrics.maintainabilityIndex}
            </div>
            <div style={{ fontSize: '11px', color: '#555' }}>
              index score
            </div>
          </div>
        </div>

        {/* Languages */}
        <div style={{
          padding: '16px',
          background: '#141414',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>Languages</div>
          {metrics.languages.map((lang) => (
            <div key={lang.name} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#ccc' }}>{lang.name}</span>
                <span style={{ color: '#666' }}>{lang.percentage}% ({lang.files} files)</span>
              </div>
              <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '2px' }}>
                <div style={{
                  height: '100%',
                  width: `${lang.percentage}%`,
                  background: '#FF00FF',
                  borderRadius: '2px'
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Tech Debt Summary */}
        <div style={{
          padding: '16px',
          background: '#141414',
          borderRadius: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#888' }}>Technical Debt</div>
            <button
              onClick={() => setViewMode('debt')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FF00FF',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              View all →
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['critical', 'high', 'medium', 'low'].map((severity) => {
              const count = context.techDebt.filter(t => t.severity === severity).length
              return (
                <div key={severity} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: getSeverityColor(severity)
                  }}>
                    {count}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', textTransform: 'capitalize' }}>
                    {severity}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderArchitecture = () => {
    if (!context) return null

    return (
      <div>
        {/* Architecture Layers */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
            Architecture Layers
          </div>
          {context.architecture.map((layer, idx) => (
            <div
              key={layer.name}
              style={{
                padding: '16px',
                background: '#141414',
                borderRadius: '10px',
                marginBottom: '8px',
                borderLeft: `3px solid ${layer.color}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: `${layer.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: layer.color
                }}>
                  {idx + 1}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>{layer.name}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                {layer.description}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {layer.components.map((comp) => (
                  <span
                    key={comp}
                    style={{
                      padding: '3px 8px',
                      background: '#1a1a1a',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: '#888'
                    }}
                  >
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Component Dependencies */}
        <div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
            Components ({context.components.length})
          </div>
          {context.components.map((comp) => (
            <div
              key={comp.name}
              style={{
                padding: '12px',
                background: '#141414',
                borderRadius: '8px',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: getComplexityColor(comp.complexity) + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileCode size={16} style={{ color: getComplexityColor(comp.complexity) }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>{comp.name}</div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  {comp.type} • {comp.linesOfCode} lines • {comp.dependencies.length} deps
                </div>
              </div>
              <span style={{
                padding: '2px 6px',
                background: getComplexityColor(comp.complexity) + '20',
                color: getComplexityColor(comp.complexity),
                borderRadius: '4px',
                fontSize: '10px'
              }}>
                {comp.complexity}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderTechDebt = () => {
    if (!context) return null

    return (
      <div>
        {context.techDebt.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '16px',
              background: '#141414',
              borderRadius: '10px',
              marginBottom: '8px',
              borderLeft: `3px solid ${getSeverityColor(item.severity)}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: getSeverityColor(item.severity) + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={14} style={{ color: getSeverityColor(item.severity) }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    padding: '2px 6px',
                    background: getSeverityColor(item.severity) + '20',
                    color: getSeverityColor(item.severity),
                    borderRadius: '4px',
                    fontSize: '10px',
                    textTransform: 'uppercase'
                  }}>
                    {item.severity}
                  </span>
                  <span style={{
                    padding: '2px 6px',
                    background: '#1a1a1a',
                    color: '#666',
                    borderRadius: '4px',
                    fontSize: '10px'
                  }}>
                    {item.type}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#fff', marginBottom: '6px' }}>
                  {item.description}
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  <code style={{ background: '#1a1a1a', padding: '2px 4px', borderRadius: '3px' }}>
                    {item.file}{item.line ? `:${item.line}` : ''}
                  </code>
                </div>
                <div style={{
                  padding: '10px',
                  background: '#0a0a0a',
                  borderRadius: '6px',
                  fontSize: '11px'
                }}>
                  <div style={{ color: '#888', marginBottom: '4px' }}>Suggestion:</div>
                  <div style={{ color: '#22c55e' }}>{item.suggestion}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                  <Clock size={12} style={{ color: '#666' }} />
                  <span style={{ fontSize: '10px', color: '#666' }}>
                    Est. effort: {item.estimatedEffort}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderRefactoring = () => {
    if (!context) return null

    return (
      <div>
        {context.refactoringOpportunities.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '16px',
              background: '#141414',
              borderRadius: '10px',
              marginBottom: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#fff', marginBottom: '4px' }}>
                  {item.title}
                </div>
                <span style={{
                  padding: '2px 6px',
                  background: '#1a1a1a',
                  color: '#888',
                  borderRadius: '4px',
                  fontSize: '10px'
                }}>
                  {item.type}
                </span>
              </div>
              {item.automatable && (
                <span style={{
                  padding: '4px 8px',
                  background: '#22c55e20',
                  color: '#22c55e',
                  borderRadius: '4px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Zap size={10} />
                  Auto-fix
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
              {item.description}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {item.files.map((file) => (
                <code
                  key={file}
                  style={{
                    padding: '3px 6px',
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    fontSize: '10px',
                    color: '#666'
                  }}
                >
                  {file}
                </code>
              ))}
            </div>
            <button
              style={{
                padding: '8px 16px',
                background: item.automatable ? '#FF00FF' : '#1a1a1a',
                border: item.automatable ? 'none' : '1px solid #2a2a2a',
                borderRadius: '6px',
                color: item.automatable ? '#fff' : '#888',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              {item.automatable ? 'Apply Refactoring' : 'View Details'}
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a0a',
      color: '#ccc'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layout size={18} style={{ color: '#FF00FF' }} />
          <span style={{ fontWeight: 600 }}>Project Insights</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={analyzeProject}
            disabled={analyzing}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <RefreshCw size={16} style={{ animation: analyzing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #1a1a1a',
        padding: '0 16px'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: BarChart2 },
          { id: 'architecture', label: 'Architecture', icon: Layers },
          { id: 'debt', label: 'Tech Debt', icon: AlertTriangle },
          { id: 'refactoring', label: 'Refactor', icon: GitBranch }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as ViewMode)}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: viewMode === tab.id ? '2px solid #FF00FF' : '2px solid transparent',
              color: viewMode === tab.id ? '#FF00FF' : '#666',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {!context ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #FF00FF20, #FF00FF10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Layout size={32} style={{ color: '#FF00FF' }} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#fff' }}>
              Analyze Your Project
            </h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px' }}>
              Get insights into architecture, tech debt, and refactoring opportunities
            </p>
            <button
              onClick={analyzeProject}
              disabled={analyzing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: '#FF00FF',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                margin: '0 auto'
              }}
            >
              {analyzing ? (
                <>
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Analyze Project
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'overview' && renderOverview()}
            {viewMode === 'architecture' && renderArchitecture()}
            {viewMode === 'debt' && renderTechDebt()}
            {viewMode === 'refactoring' && renderRefactoring()}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
