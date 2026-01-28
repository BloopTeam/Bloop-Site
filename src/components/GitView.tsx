import { useState } from 'react'
import { 
  GitBranch, GitCommit, Plus, RefreshCw, Check, X, 
  ChevronDown, ChevronRight, FileDiff, GitMerge, AlertCircle
} from 'lucide-react'
import { generateBranchGraph, generateCommits, generateDiff, getCommitTemplates, detectConflicts } from '../utils/gitUtils'

interface GitViewProps {
  onShowDiff?: (file: string) => void
}

export default function GitView({ onShowDiff }: GitViewProps) {
  const [branches] = useState(generateBranchGraph())
  const [commits] = useState(generateCommits())
  const [stagedFiles, setStagedFiles] = useState<string[]>(['App.tsx', 'styles.css'])
  const [unstagedFiles] = useState<string[]>(['utils.ts', 'config.json'])
  const [commitMessage, setCommitMessage] = useState('')
  const [showCommitTemplates, setShowCommitTemplates] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['changes', 'branches']))
  const [selectedBranch, setSelectedBranch] = useState('main')

  const templates = getCommitTemplates()

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const stageFile = (file: string) => {
    setStagedFiles(prev => [...prev, file])
  }

  const unstageFile = (file: string) => {
    setStagedFiles(prev => prev.filter(f => f !== file))
  }

  const handleCommit = () => {
    if (commitMessage.trim() && stagedFiles.length > 0) {
      console.log('Committing:', { message: commitMessage, files: stagedFiles })
      setCommitMessage('')
      setStagedFiles([])
    }
  }

  const getFileStatusIcon = (status: 'modified' | 'added' | 'deleted') => {
    switch (status) {
      case 'modified': return <FileDiff size={14} style={{ color: '#FFA500' }} />
      case 'added': return <Plus size={14} style={{ color: '#22c55e' }} />
      case 'deleted': return <X size={14} style={{ color: '#ef4444' }} />
    }
  }

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
          <GitBranch size={16} style={{ color: '#FF00FF' }} />
          <span style={{ fontWeight: 600 }}>Source Control</span>
        </div>
        <button
          onClick={() => {}}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#858585',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Branch Selector */}
      <div style={{
        padding: '8px 12px',
        background: '#1e1e1e',
        borderBottom: '1px solid #3e3e42',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <GitBranch size={14} style={{ color: '#858585' }} />
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#cccccc',
            fontSize: '13px',
            cursor: 'pointer',
            flex: 1
          }}
        >
          {branches.map(branch => (
            <option key={branch.name} value={branch.name}>
              {branch.name} {branch.current ? '(current)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Changes Section */}
      <div>
        <div
          onClick={() => toggleSection('changes')}
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            background: expandedSections.has('changes') ? '#2a2d2e' : 'transparent',
            borderBottom: '1px solid #3e3e42'
          }}
        >
          {expandedSections.has('changes') ? (
            <ChevronDown size={14} style={{ color: '#858585' }} />
          ) : (
            <ChevronRight size={14} style={{ color: '#858585' }} />
          )}
          <span style={{ fontWeight: 500 }}>Changes</span>
          <span style={{ marginLeft: 'auto', color: '#858585', fontSize: '11px' }}>
            {stagedFiles.length + unstagedFiles.length}
          </span>
        </div>

        {expandedSections.has('changes') && (
          <div>
            {/* Staged Changes */}
            {stagedFiles.length > 0 && (
              <div style={{ padding: '4px 0' }}>
                <div style={{
                  padding: '4px 12px',
                  fontSize: '11px',
                  color: '#858585',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Staged Changes
                </div>
                {stagedFiles.map(file => (
                  <div
                    key={file}
                    style={{
                      padding: '6px 12px 6px 32px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      background: 'transparent',
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#2a2d2e'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => onShowDiff?.(file)}
                  >
                    {getFileStatusIcon('modified')}
                    <span style={{ flex: 1 }}>{file}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        unstageFile(file)
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#858585',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Unstaged Changes */}
            {unstagedFiles.length > 0 && (
              <div style={{ padding: '4px 0' }}>
                <div style={{
                  padding: '4px 12px',
                  fontSize: '11px',
                  color: '#858585',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Unstaged Changes
                </div>
                {unstagedFiles.map(file => (
                  <div
                    key={file}
                    style={{
                      padding: '6px 12px 6px 32px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      background: 'transparent',
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#2a2d2e'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => onShowDiff?.(file)}
                  >
                    {getFileStatusIcon('modified')}
                    <span style={{ flex: 1 }}>{file}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        stageFile(file)
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#858585',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Commit Message */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #3e3e42',
        borderBottom: '1px solid #3e3e42',
        background: '#1e1e1e'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Message (Ctrl+Enter to commit)"
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === 'Enter') {
                handleCommit()
              }
            }}
            onClick={() => setShowCommitTemplates(true)}
            style={{
              flex: 1,
              background: '#0a0a0a',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              padding: '6px 8px',
              color: '#cccccc',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          {showCommitTemplates && (
            <div style={{
              position: 'absolute',
              background: '#1e1e1e',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              marginTop: '32px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              minWidth: '200px'
            }}>
              {templates.map((template, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCommitMessage(template)
                    setShowCommitTemplates(false)
                  }}
                  style={{
                    padding: '6px 12px',
                    cursor: 'pointer',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#2a2d2e'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {template}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || stagedFiles.length === 0}
          style={{
            width: '100%',
            padding: '8px',
            background: stagedFiles.length > 0 && commitMessage.trim() ? '#FF00FF' : '#3e3e42',
            border: 'none',
            borderRadius: '4px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
            cursor: stagedFiles.length > 0 && commitMessage.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Check size={14} />
          Commit {stagedFiles.length > 0 ? `(${stagedFiles.length})` : ''}
        </button>
      </div>

      {/* Branch Graph */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div
          onClick={() => toggleSection('branches')}
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            background: expandedSections.has('branches') ? '#2a2d2e' : 'transparent',
            borderBottom: '1px solid #3e3e42'
          }}
        >
          {expandedSections.has('branches') ? (
            <ChevronDown size={14} style={{ color: '#858585' }} />
          ) : (
            <ChevronRight size={14} style={{ color: '#858585' }} />
          )}
          <span style={{ fontWeight: 500 }}>Branches</span>
        </div>

        {expandedSections.has('branches') && (
          <div style={{ padding: '8px 12px' }}>
            {branches.map(branch => (
              <div
                key={branch.name}
                style={{
                  padding: '8px',
                  marginBottom: '4px',
                  background: branch.current ? '#2a2d2e' : 'transparent',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => !branch.current && (e.currentTarget.style.background = '#1e1e1e')}
                onMouseLeave={(e) => !branch.current && (e.currentTarget.style.background = branch.current ? '#2a2d2e' : 'transparent')}
                onClick={() => setSelectedBranch(branch.name)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <GitBranch size={14} style={{ color: branch.current ? '#FF00FF' : '#858585' }} />
                  <span style={{ fontWeight: branch.current ? 600 : 400 }}>
                    {branch.name}
                    {branch.current && <span style={{ color: '#858585', marginLeft: '4px' }}>(current)</span>}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#666', paddingLeft: '22px' }}>
                  {branch.ahead > 0 && <span style={{ color: '#22c55e' }}>↑{branch.ahead} </span>}
                  {branch.behind > 0 && <span style={{ color: '#ef4444' }}>↓{branch.behind} </span>}
                  {branch.lastCommit} - {branch.author}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Commits */}
        <div
          onClick={() => toggleSection('commits')}
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            background: expandedSections.has('commits') ? '#2a2d2e' : 'transparent',
            borderTop: '1px solid #3e3e42',
            borderBottom: '1px solid #3e3e42'
          }}
        >
          {expandedSections.has('commits') ? (
            <ChevronDown size={14} style={{ color: '#858585' }} />
          ) : (
            <ChevronRight size={14} style={{ color: '#858585' }} />
          )}
          <GitCommit size={14} style={{ color: '#858585' }} />
          <span style={{ fontWeight: 500 }}>Recent Commits</span>
        </div>

        {expandedSections.has('commits') && (
          <div style={{ padding: '8px 12px' }}>
            {commits.map(commit => (
              <div
                key={commit.hash}
                style={{
                  padding: '8px',
                  marginBottom: '4px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#2a2d2e'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                    {commit.hash.substring(0, 7)}
                  </span>
                  <span style={{ fontSize: '12px' }}>{commit.message}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#666', paddingLeft: '60px' }}>
                  {commit.author} • {commit.date.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
