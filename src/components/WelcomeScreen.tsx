import { useState } from 'react'
import { FolderOpen, FileText, GitBranch, Plus, Clock } from 'lucide-react'
import Logo from './Logo'

interface WelcomeScreenProps {
  onOpenFile: () => void
  onOpenFolder: () => void
  onNewFile: () => void
  onCloneRepo: (url: string) => void
  onOpenRecent: (path: string) => void
  recentProjects?: { name: string; path: string; lastOpened: Date }[]
}

export default function WelcomeScreen({
  onOpenFile,
  onOpenFolder,
  onNewFile,
  onCloneRepo,
  onOpenRecent,
  recentProjects = []
}: WelcomeScreenProps) {
  const [repoUrl, setRepoUrl] = useState('')
  const [showCloneInput, setShowCloneInput] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  const handleClone = () => {
    if (repoUrl.trim()) {
      onCloneRepo(repoUrl.trim())
      setRepoUrl('')
      setShowCloneInput(false)
    }
  }

  const actions = [
    { id: 'new', icon: Plus, label: 'New File', shortcut: 'Ctrl+N', onClick: onNewFile },
    { id: 'open', icon: FileText, label: 'Open File', shortcut: 'Ctrl+O', onClick: onOpenFile },
    { id: 'folder', icon: FolderOpen, label: 'Open Folder', shortcut: 'Ctrl+K O', onClick: onOpenFolder },
    { id: 'clone', icon: GitBranch, label: 'Clone Repository', shortcut: '', onClick: () => setShowCloneInput(true) },
  ]

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      background: '#000000',
      overflow: 'hidden'
    }}>
      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Logo size={56} />
          <h1 style={{ 
            fontSize: '28px', 
            color: '#fff', 
            margin: '16px 0 4px 0', 
            fontWeight: 700,
            letterSpacing: '-0.02em'
          }}>
            Bloop
          </h1>
          <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>
            Code without limits
          </p>
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'flex', gap: '48px', maxWidth: '600px', width: '100%' }}>
          {/* Start Column */}
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#555', 
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Start
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  onMouseEnter={() => setHovered(action.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: hovered === action.id ? '#141414' : 'transparent',
                    border: 'none',
                    borderLeft: `2px solid ${hovered === action.id ? '#FF00FF' : 'transparent'}`,
                    color: hovered === action.id ? '#fff' : '#888',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    transition: 'all 0.1s',
                    width: '100%'
                  }}
                >
                  <action.icon size={15} style={{ color: hovered === action.id ? '#FF00FF' : '#666' }} />
                  <span style={{ flex: 1 }}>{action.label}</span>
                  {action.shortcut && (
                    <span style={{ fontSize: '10px', color: '#444', fontFamily: 'monospace' }}>
                      {action.shortcut}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Clone Input */}
            {showCloneInput && (
              <div style={{ 
                marginTop: '12px', 
                marginLeft: '14px',
                padding: '12px',
                background: '#0f0f0f',
                border: '1px solid #1a1a1a'
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      background: '#0a0a0a',
                      border: '1px solid #2a2a2a',
                      color: '#fff',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleClone()}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#FF00FF'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                    autoFocus
                  />
                  <button
                    onClick={handleClone}
                    style={{
                      padding: '8px 14px',
                      background: '#FF00FF',
                      border: 'none',
                      color: '#000',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Clone
                  </button>
                </div>
                <button
                  onClick={() => setShowCloneInput(false)}
                  style={{
                    marginTop: '6px',
                    background: 'transparent',
                    border: 'none',
                    color: '#555',
                    fontSize: '10px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Recent Column */}
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#555', 
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Clock size={11} />
              Recent
            </div>
            
            {recentProjects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {recentProjects.slice(0, 5).map((project, idx) => (
                  <button
                    key={project.path}
                    onClick={() => onOpenRecent(project.path)}
                    onMouseEnter={() => setHovered(`recent-${idx}`)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: hovered === `recent-${idx}` ? '#141414' : 'transparent',
                      border: 'none',
                      borderLeft: `2px solid ${hovered === `recent-${idx}` ? '#FF00FF' : 'transparent'}`,
                      color: hovered === `recent-${idx}` ? '#fff' : '#888',
                      cursor: 'pointer',
                      fontSize: '13px',
                      textAlign: 'left',
                      transition: 'all 0.1s',
                      width: '100%'
                    }}
                  >
                    <FolderOpen size={15} style={{ color: hovered === `recent-${idx}` ? '#FF00FF' : '#666' }} />
                    <span style={{ 
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {project.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ 
                padding: '20px', 
                color: '#333', 
                fontSize: '12px',
                textAlign: 'center',
                border: '1px dashed #1a1a1a'
              }}>
                No recent projects
              </div>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div style={{ 
          marginTop: '48px', 
          fontSize: '11px', 
          color: '#333'
        }}>
          <kbd style={{
            background: '#141414',
            padding: '3px 8px',
            border: '1px solid #2a2a2a',
            color: '#666',
            fontSize: '10px'
          }}>Ctrl+Shift+P</kbd>
          <span style={{ marginLeft: '8px' }}>Command Palette</span>
        </div>
      </div>
    </div>
  )
}
