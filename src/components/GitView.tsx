/**
 * Git View Component
 * 
 * User-specific source control - only active when user is working
 * All data is stored per-user in database (not shared)
 */
import { useState, useEffect } from 'react'
import { 
  GitBranch, GitCommit, Plus, RefreshCw, Check, X, 
  ChevronDown, ChevronRight, FileDiff, GitMerge, AlertCircle
} from 'lucide-react'
import { userSessionService } from '../services/userSession'

interface GitViewProps {
  onShowDiff?: (file: string) => void
}

export default function GitView({ onShowDiff }: GitViewProps) {
  const [isActive, setIsActive] = useState(false)
  const [branches, setBranches] = useState<{ name: string; current: boolean }[]>([])
  const [commits, setCommits] = useState<any[]>([])
  const [stagedFiles, setStagedFiles] = useState<string[]>([])
  const [unstagedFiles, setUnstagedFiles] = useState<string[]>([])
  const [commitMessage, setCommitMessage] = useState('')
  const [showCommitTemplates, setShowCommitTemplates] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['changes']))
  const [selectedBranch, setSelectedBranch] = useState('main')
  const [loading, setLoading] = useState(false)

  // Only activate when user starts working (user-specific check)
  useEffect(() => {
    const userId = userSessionService.getCurrentUserId()
    const hasActiveProject = userId
      ? sessionStorage.getItem(`bloop-has-project-${userId}`) === 'true' || localStorage.getItem('bloop-has-project') === 'true'
      : localStorage.getItem('bloop-has-project') === 'true'
    
    if (hasActiveProject) {
      setIsActive(true)
      loadGitData()
    } else {
      setIsActive(false)
      setBranches([])
      setCommits([])
      setStagedFiles([])
      setUnstagedFiles([])
    }
  }, [])

  // Listen for project activity
  useEffect(() => {
    const handleProjectActivity = () => {
      if (!isActive) {
        setIsActive(true)
        loadGitData()
      }
    }

    window.addEventListener('bloop:project-activity', handleProjectActivity)
    return () => window.removeEventListener('bloop:project-activity', handleProjectActivity)
  }, [isActive])

  const loadGitData = async () => {
    if (!isActive) return
    
    setLoading(true)
    try {
      // TODO: Replace with actual API call to user-specific database
      // const userId = getCurrentUserId()
      // const data = await apiService.getUserGitData(userId)
      
      // For now, simulate user-specific data (empty by default)
      setBranches([{ name: 'main', current: true }])
      setCommits([])
      setStagedFiles([])
      setUnstagedFiles([])
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

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
    setUnstagedFiles(prev => prev.filter(f => f !== file))
  }

  const unstageFile = (file: string) => {
    setStagedFiles(prev => prev.filter(f => f !== file))
    setUnstagedFiles(prev => [...prev, file])
  }

  const handleCommit = async () => {
    if (commitMessage.trim() && stagedFiles.length > 0) {
      try {
        // TODO: Commit to user's repository via API
        // const userId = getCurrentUserId()
        // await apiService.commitUserFiles(userId, commitMessage, stagedFiles)
        
        // Simulate commit
        const newCommit = {
          id: Date.now().toString(),
          message: commitMessage,
          author: 'You',
          date: new Date(),
          files: stagedFiles
        }
        setCommits(prev => [newCommit, ...prev])
        setCommitMessage('')
        setStagedFiles([])
      } catch (error) {
        console.error('Commit failed:', error)
      }
    }
  }

  const getFileStatusIcon = (status: 'modified' | 'added' | 'deleted') => {
    switch (status) {
      case 'modified': return <FileDiff size={14} style={{ color: '#FFA500' }} />
      case 'added': return <Plus size={14} style={{ color: '#22c55e' }} />
      case 'deleted': return <X size={14} style={{ color: '#ef4444' }} />
    }
  }

  const commitTemplates = [
    'feat: Add new feature',
    'fix: Fix bug',
    'docs: Update documentation',
    'style: Format code',
    'refactor: Refactor code',
    'test: Add tests',
    'chore: Update dependencies'
  ]

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
            <GitBranch size={16} style={{ color: '#FF00FF' }} />
            <span style={{ fontWeight: 600 }}>Source Control</span>
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
          <GitBranch size={48} style={{ color: '#3e3e42', marginBottom: '16px', opacity: 0.5 }} />
          <div style={{ fontSize: '13px', color: '#858585', marginBottom: '8px' }}>
            Source control will begin when you start working
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
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitBranch size={16} style={{ color: '#FF00FF' }} />
          <span style={{ fontWeight: 600 }}>Source Control</span>
        </div>
        <button
          onClick={loadGitData}
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
          title="Refresh Git status"
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
            flex: 1,
            outline: 'none'
          }}
        >
          {branches.map(branch => (
            <option key={branch.name} value={branch.name} style={{ background: '#252526' }}>
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
          onMouseEnter={(e) => {
            if (!expandedSections.has('changes')) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            }
          }}
          onMouseLeave={(e) => {
            if (!expandedSections.has('changes')) {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          {expandedSections.has('changes') ? (
            <ChevronDown size={14} style={{ color: '#858585' }} />
          ) : (
            <ChevronRight size={14} style={{ color: '#858585' }} />
          )}
          <span style={{ fontSize: '12px', fontWeight: 500 }}>Changes</span>
          <span style={{ fontSize: '11px', color: '#666', marginLeft: 'auto' }}>
            {stagedFiles.length + unstagedFiles.length}
          </span>
        </div>

        {expandedSections.has('changes') && (
          <div style={{ padding: '8px' }}>
            {stagedFiles.length === 0 && unstagedFiles.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                No changes detected
              </div>
            ) : (
              <>
                {stagedFiles.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#858585', marginBottom: '6px', fontWeight: 500 }}>
                      Staged Changes
                    </div>
                    {stagedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        onClick={() => onShowDiff?.(file)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 0, 255, 0.08)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {getFileStatusIcon('added')}
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
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#FF00FF'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#858585'
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {unstagedFiles.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#858585', marginBottom: '6px', fontWeight: 500 }}>
                      Changes
                    </div>
                    {unstagedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        onClick={() => onShowDiff?.(file)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 0, 255, 0.08)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
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
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#FF00FF'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#858585'
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Commit Section */}
      {stagedFiles.length > 0 && (
        <div style={{
          padding: '12px',
          borderTop: '1px solid #3e3e42',
          background: '#1e1e1e'
        }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
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
              style={{
                flex: 1,
                background: '#0a0a0a',
                border: '1px solid #3e3e42',
                borderRadius: '4px',
                padding: '6px 10px',
                color: '#ccc',
                fontSize: '12px',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#FF00FF'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#3e3e42'}
            />
            <button
              onClick={() => setShowCommitTemplates(!showCommitTemplates)}
              style={{
                background: 'transparent',
                border: '1px solid #3e3e42',
                borderRadius: '4px',
                padding: '6px 8px',
                color: '#858585',
                cursor: 'pointer',
                fontSize: '11px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FF00FF'
                e.currentTarget.style.color = '#FF00FF'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#3e3e42'
                e.currentTarget.style.color = '#858585'
              }}
            >
              Templates
            </button>
          </div>

          {showCommitTemplates && (
            <div style={{
              marginBottom: '8px',
              padding: '6px',
              background: '#0a0a0a',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              maxHeight: '120px',
              overflow: 'auto'
            }}>
              {commitTemplates.map((template, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCommitMessage(template)
                    setShowCommitTemplates(false)
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    color: '#858585',
                    cursor: 'pointer',
                    borderRadius: '2px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 0, 255, 0.1)'
                    e.currentTarget.style.color = '#FF00FF'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#858585'
                  }}
                >
                  {template}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || stagedFiles.length === 0}
            style={{
              width: '100%',
              padding: '8px',
              background: stagedFiles.length > 0 && commitMessage.trim() ? '#FF00FF' : '#3e3e42',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 500,
              cursor: stagedFiles.length > 0 && commitMessage.trim() ? 'pointer' : 'not-allowed',
              opacity: stagedFiles.length > 0 && commitMessage.trim() ? 1 : 0.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <GitCommit size={14} />
              Commit ({stagedFiles.length})
            </div>
          </button>
        </div>
      )}

      {/* Commits History */}
      {commits.length > 0 && (
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          <div style={{ fontSize: '11px', color: '#858585', marginBottom: '8px', fontWeight: 500 }}>
            Recent Commits
          </div>
          {commits.map((commit) => (
            <div
              key={commit.id}
              style={{
                padding: '8px',
                background: '#1e1e1e',
                borderRadius: '4px',
                marginBottom: '6px',
                fontSize: '12px'
              }}
            >
              <div style={{ fontWeight: 500, color: '#ccc', marginBottom: '4px' }}>
                {commit.message}
              </div>
              <div style={{ fontSize: '10px', color: '#666' }}>
                {commit.author} • {new Date(commit.date).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
