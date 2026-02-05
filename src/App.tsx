import React, { useState, useEffect, useCallback, useRef } from 'react'
import MenuBar from './components/MenuBar'
import LeftSidebar from './components/LeftSidebar'
import EditorArea, { EditorAreaRef } from './components/EditorArea'
import AssistantPanel from './components/AssistantPanel'
import StatusBar from './components/StatusBar'
import CommandPalette from './components/CommandPalette'
import BeginnerGuide from './components/BeginnerGuide'
import ResizeHandle from './components/ResizeHandle'
import Toast, { ToastMessage } from './components/Toast'
import TerminalPanel from './components/TerminalPanel'
import OpenClawPanel from './components/OpenClawPanel'
import MoltbookPanel from './components/MoltbookPanel'
import WelcomeScreen from './components/WelcomeScreen'
import CollaborationPanel from './components/CollaborationPanel'
import AgentInsightsPanel from './components/AgentInsightsPanel'
import ProjectInsightsPanel from './components/ProjectInsightsPanel'
import AutomationPanel from './components/AutomationPanel'
import PluginManagementPanel from './components/PluginManagementPanel'
import PluginMarketplacePanel from './components/PluginMarketplacePanel'
import WorkflowTemplatesPanel from './components/WorkflowTemplatesPanel'
import TeamOrganizationPanel from './components/TeamOrganizationPanel'
import SharedAgentsPanel from './components/SharedAgentsPanel'
import { openClawService } from './services/openclaw'
import { userSessionService } from './services/userSession'

// Right panel modes
type RightPanelMode = 'assistant' | 'openclaw' | 'moltbook' | 'collaboration' | 'agents' | 'project' | 'automation' | 'plugins' | 'marketplace' | 'workflows' | 'teams' | 'shared-agents'

// Recent project type
interface RecentProject {
  name: string
  path: string
  lastOpened: Date
}

export default function App() {
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [assistantCollapsed, setAssistantCollapsed] = useState(false)
  const [terminalVisible, setTerminalVisible] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('assistant')
  const [doNotDisturb, setDoNotDisturb] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showNotificationHistory, setShowNotificationHistory] = useState(false)

  // Initialize user session for multi-user support (1000+ concurrent users)
  // MUST be initialized before any components try to use it
  useEffect(() => {
    // Ensure userSessionService is imported and available
    if (typeof userSessionService === 'undefined') {
      console.error('userSessionService is not available')
      return
    }

    try {
      // Initialize user session - in production, this would get userId from auth
      if (userSessionService && typeof userSessionService.initializeSession === 'function') {
        userSessionService.initializeSession()
      }
      
      // Update activity on user interactions
      const handleActivity = () => {
        try {
          if (userSessionService && typeof userSessionService.updateActivity === 'function') {
            userSessionService.updateActivity()
            // Dispatch event for panels to activate
            window.dispatchEvent(new CustomEvent('bloop:project-activity'))
          }
        } catch (err) {
          // Silently fail if service not ready
          console.warn('Activity tracking failed:', err)
        }
      }

      // Listen for project-related activities
      window.addEventListener('focus', handleActivity)
      document.addEventListener('click', handleActivity, true)
      document.addEventListener('keydown', handleActivity, true)

      return () => {
        window.removeEventListener('focus', handleActivity)
        document.removeEventListener('click', handleActivity, true)
        document.removeEventListener('keydown', handleActivity, true)
      }
    } catch (error) {
      console.error('Failed to initialize user session:', error)
    }
  }, [])
  
  // Welcome screen state - show welcome by default, hide when project is opened (user-specific)
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      const userId = userSessionService?.getCurrentUserId?.()
      const hasProject = userId
        ? sessionStorage.getItem(`bloop-has-project-${userId}`) === 'true' || localStorage.getItem('bloop-has-project') === 'true'
        : localStorage.getItem('bloop-has-project') === 'true'
      return !hasProject
    } catch {
      // Fallback if service not ready
      return localStorage.getItem('bloop-has-project') !== 'true'
    }
  })
  
  // Recent projects from localStorage
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => {
    const saved = localStorage.getItem('bloop-recent-projects')
    if (saved) {
      try {
        return JSON.parse(saved).map((p: any) => ({
          ...p,
          lastOpened: new Date(p.lastOpened)
        }))
      } catch {
        return []
      }
    }
    return []
  })
  
  // Editor ref for file operations
  const editorRef = useRef<EditorAreaRef>(null)
  
  // Load panel widths from localStorage or use defaults
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('bloop-sidebar-width')
    return saved ? Number.parseInt(saved, 10) : 320
  })
  
  const [assistantWidth, setAssistantWidth] = useState(() => {
    const saved = localStorage.getItem('bloop-assistant-width')
    return saved ? Number.parseInt(saved, 10) : 480
  })

  const [terminalHeight, setTerminalHeight] = useState(() => {
    const saved = localStorage.getItem('bloop-terminal-height')
    return saved ? Number.parseInt(saved, 10) : 200
  })

  // Toast functions
  const addToast = useCallback((type: ToastMessage['type'], message: string, duration?: number, actions?: ToastMessage['actions'], group?: string) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { 
      id, 
      type, 
      message, 
      duration, 
      actions,
      group,
      timestamp: new Date(),
      sound: soundEnabled
    }])
  }, [soundEnabled])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Save widths to localStorage when they change
  useEffect(() => {
    localStorage.setItem('bloop-sidebar-width', sidebarWidth.toString())
  }, [sidebarWidth])

  useEffect(() => {
    localStorage.setItem('bloop-assistant-width', assistantWidth.toString())
  }, [assistantWidth])

  useEffect(() => {
    localStorage.setItem('bloop-terminal-height', terminalHeight.toString())
  }, [terminalHeight])

  const handleSidebarResize = (delta: number) => {
    setSidebarWidth(prev => {
      const newWidth = prev + delta
      return Math.max(200, Math.min(600, newWidth))
    })
  }

  const handleAssistantResize = (delta: number) => {
    setAssistantWidth(prev => {
      const newWidth = prev - delta // Negative because we're resizing from the left
      return Math.max(300, Math.min(800, newWidth))
    })
  }

  const handleTerminalResize = (delta: number) => {
    setTerminalHeight(prev => {
      const newHeight = prev + delta
      return Math.max(100, Math.min(500, newHeight))
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
      // Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setSidebarCollapsed(prev => !prev)
      }
      // Toggle terminal
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault()
        setTerminalVisible(prev => !prev)
      }
      // Save (simulated)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        addToast('success', 'File saved successfully')
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [addToast])

  // Save recent projects to localStorage
  useEffect(() => {
    localStorage.setItem('bloop-recent-projects', JSON.stringify(recentProjects))
  }, [recentProjects])

  // Add a project to recent projects
  const addRecentProject = useCallback((name: string, path: string) => {
    setRecentProjects(prev => {
      const filtered = prev.filter(p => p.path !== path)
      const newProject = { name, path, lastOpened: new Date() }
      return [newProject, ...filtered].slice(0, 10) // Keep max 10 recent
    })
    try {
      const userId = userSessionService?.getCurrentUserId?.()
      if (userId) {
        sessionStorage.setItem(`bloop-has-project-${userId}`, 'true')
        localStorage.setItem('bloop-has-project', 'true') // Legacy support
        userSessionService?.setActiveProject?.(name)
        userSessionService?.updateActivity?.()
        window.dispatchEvent(new CustomEvent('bloop:project-activity'))
      } else {
        localStorage.setItem('bloop-has-project', 'true') // Fallback
      }
    } catch (error) {
      // Fallback if service not ready
      localStorage.setItem('bloop-has-project', 'true')
    }
  }, [])

  // Handle opening a folder
  const handleOpenFolder = async () => {
    try {
      if ('showDirectoryPicker' in globalThis) {
        const dirHandle = await (globalThis as any).showDirectoryPicker()
        const name = dirHandle.name
        addRecentProject(name, name) // Path is same as name for now
        setShowWelcome(false)
        
        // Set the project folder in EditorArea for auto-saving
        editorRef.current?.setProjectFolder(dirHandle)
        
        try {
          const userId = userSessionService?.getCurrentUserId?.()
          if (userId) {
            sessionStorage.setItem(`bloop-has-project-${userId}`, 'true')
            localStorage.setItem('bloop-has-project', 'true') // Legacy support
            userSessionService?.setActiveProject?.(name)
            userSessionService?.updateActivity?.()
            window.dispatchEvent(new CustomEvent('bloop:project-activity'))
          } else {
            localStorage.setItem('bloop-has-project', 'true')
          }
        } catch {
          localStorage.setItem('bloop-has-project', 'true')
        }
        
        addToast('success', `Opened folder: ${name} - Files will auto-save here`)
      } else {
        // Fallback for browsers without directory picker
        addToast('info', 'Folder picker not supported in this browser. Try opening individual files instead.')
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        addToast('error', 'Failed to open folder')
      }
    }
  }

  // Handle opening a file from welcome screen
  const handleOpenFileFromWelcome = () => {
    editorRef.current?.openFile()
    setShowWelcome(false)
    try {
      const userId = userSessionService?.getCurrentUserId?.()
      if (userId) {
        sessionStorage.setItem(`bloop-has-project-${userId}`, 'true')
        localStorage.setItem('bloop-has-project', 'true') // Legacy support
        userSessionService?.updateActivity?.()
        window.dispatchEvent(new CustomEvent('bloop:project-activity'))
      } else {
        localStorage.setItem('bloop-has-project', 'true')
      }
    } catch {
      localStorage.setItem('bloop-has-project', 'true')
    }
  }

  // Handle creating a new file from welcome screen
  const handleNewFileFromWelcome = () => {
    editorRef.current?.createNewFile()
    setShowWelcome(false)
    try {
      const userId = userSessionService?.getCurrentUserId?.()
      if (userId) {
        sessionStorage.setItem(`bloop-has-project-${userId}`, 'true')
        localStorage.setItem('bloop-has-project', 'true') // Legacy support
        userSessionService?.updateActivity?.()
        window.dispatchEvent(new CustomEvent('bloop:project-activity'))
      } else {
        localStorage.setItem('bloop-has-project', 'true')
      }
    } catch {
      localStorage.setItem('bloop-has-project', 'true')
    }
  }

  // Handle cloning a repo
  const handleCloneRepo = (url: string) => {
    // In a real app, this would clone the repo
    // For now, just show a message and extract repo name
    const repoName = url.split('/').pop()?.replace('.git', '') || 'repository'
    addToast('info', `Cloning ${repoName}... (Git operations require backend)`)
    addRecentProject(repoName, url)
    setShowWelcome(false)
    try {
      const userId = userSessionService?.getCurrentUserId?.()
      if (userId) {
        sessionStorage.setItem(`bloop-has-project-${userId}`, 'true')
        localStorage.setItem('bloop-has-project', 'true') // Legacy support
        userSessionService?.setActiveProject?.(repoName)
        userSessionService?.updateActivity?.()
        window.dispatchEvent(new CustomEvent('bloop:project-activity'))
      } else {
        localStorage.setItem('bloop-has-project', 'true')
      }
    } catch {
      localStorage.setItem('bloop-has-project', 'true')
    }
  }

  // Handle opening a recent project
  const handleOpenRecent = (path: string) => {
    const project = recentProjects.find(p => p.path === path)
    if (project) {
      addToast('info', `Opening ${project.name}...`)
      addRecentProject(project.name, project.path)
      setShowWelcome(false)
      try {
        const userId = userSessionService?.getCurrentUserId?.()
        if (userId) {
          sessionStorage.setItem(`bloop-has-project-${userId}`, 'true')
          localStorage.setItem('bloop-has-project', 'true') // Legacy support
          userSessionService?.setActiveProject?.(project.name)
          userSessionService?.updateActivity?.()
          window.dispatchEvent(new CustomEvent('bloop:project-activity'))
        } else {
          localStorage.setItem('bloop-has-project', 'true')
        }
      } catch {
        localStorage.setItem('bloop-has-project', 'true')
      }
    }
  }

  // Command palette actions
  const commandActions = {
    toggleSidebar: () => setSidebarCollapsed(prev => !prev),
    toggleTerminal: () => setTerminalVisible(prev => !prev),
    toggleAssistant: () => setAssistantCollapsed(prev => !prev),
    showToast: (type: ToastMessage['type'], message: string) => addToast(type, message),
    createNewFile: () => {
      editorRef.current?.createNewFile()
      setShowWelcome(false)
      localStorage.setItem('bloop-has-project', 'true')
    },
    openFile: () => {
      editorRef.current?.openFile()
      setShowWelcome(false)
      localStorage.setItem('bloop-has-project', 'true')
    },
    saveFile: () => editorRef.current?.saveFile(),
    goToLine: () => {
      // Trigger go to line - could show a dialog
      addToast('info', 'Go to Line (Ctrl+G) - Enter line number')
    },
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#1e1e1e',
      color: '#cccccc',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px'
    }}>
      <MenuBar 
        onToggleTerminal={() => setTerminalVisible(prev => !prev)}
        onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
        onToggleAssistant={() => setAssistantCollapsed(prev => !prev)}
        onShowCommandPalette={() => setShowCommandPalette(true)}
        onNewFile={() => {
          editorRef.current?.createNewFile()
          setShowWelcome(false)
          try {
            const userId = userSessionService?.getCurrentUserId?.()
            if (userId) {
              sessionStorage.setItem(`bloop-has-project-${userId}`, 'true')
              localStorage.setItem('bloop-has-project', 'true') // Legacy support
              userSessionService?.updateActivity?.()
              window.dispatchEvent(new CustomEvent('bloop:project-activity'))
            } else {
              localStorage.setItem('bloop-has-project', 'true')
            }
          } catch {
            localStorage.setItem('bloop-has-project', 'true')
          }
        }}
        onOpenFile={() => {
          editorRef.current?.openFile()
          setShowWelcome(false)
          try {
            const userId = userSessionService?.getCurrentUserId?.()
            if (userId) {
              sessionStorage.setItem(`bloop-has-project-${userId}`, 'true')
              localStorage.setItem('bloop-has-project', 'true') // Legacy support
              userSessionService?.updateActivity?.()
              window.dispatchEvent(new CustomEvent('bloop:project-activity'))
            } else {
              localStorage.setItem('bloop-has-project', 'true')
            }
          } catch {
            localStorage.setItem('bloop-has-project', 'true')
          }
        }}
        onOpenFolder={handleOpenFolder}
        onSaveFile={() => editorRef.current?.saveFile()}
        onShowToast={addToast}
      />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {!sidebarCollapsed && !showWelcome && (
            <>
              <LeftSidebar 
                onCollapse={() => setSidebarCollapsed(true)} 
                width={sidebarWidth}
                onShowToast={addToast}
                onCreateNewFile={() => {
                  editorRef.current?.createNewFile()
                  setShowWelcome(false)
                  try {
                    const userId = userSessionService?.getCurrentUserId?.()
                    if (userId) {
                      sessionStorage.setItem(`bloop-has-project-${userId}`, 'true')
                      localStorage.setItem('bloop-has-project', 'true') // Legacy support
                      userSessionService?.updateActivity?.()
                      window.dispatchEvent(new CustomEvent('bloop:project-activity'))
                    } else {
                      localStorage.setItem('bloop-has-project', 'true')
                    }
                  } catch {
                    localStorage.setItem('bloop-has-project', 'true')
                  }
                }}
                onCreateNewFolder={async () => {
                  try {
                    if ('showDirectoryPicker' in globalThis) {
                      const handle = await (globalThis as any).showDirectoryPicker({ mode: 'readwrite' })
                      editorRef.current?.setProjectFolder(handle)
                      try {
                        const userId = userSessionService?.getCurrentUserId?.()
                        if (userId) {
                          sessionStorage.setItem(`bloop-has-project-${userId}`, 'true')
                          localStorage.setItem('bloop-has-project', 'true') // Legacy support
                          userSessionService?.setActiveProject?.(handle.name)
                          userSessionService?.updateActivity?.()
                          window.dispatchEvent(new CustomEvent('bloop:project-activity'))
                        } else {
                          localStorage.setItem('bloop-has-project', 'true')
                        }
                      } catch {
                        localStorage.setItem('bloop-has-project', 'true')
                      }
                      addToast('success', `Project folder set: ${handle.name}`)
                    }
                  } catch (err: any) {
                    if (err.name !== 'AbortError') {
                      addToast('error', 'Failed to create folder')
                    }
                  }
                }}
                onOpenFolder={handleOpenFolder}
                onSwitchRightPanel={(mode) => setRightPanelMode(mode as RightPanelMode)}
              />
              <ResizeHandle onResize={handleSidebarResize} direction="horizontal" />
            </>
          )}
          
          {showWelcome && (
            <WelcomeScreen
              onOpenFile={handleOpenFileFromWelcome}
              onOpenFolder={handleOpenFolder}
              onNewFile={handleNewFileFromWelcome}
              onCloneRepo={handleCloneRepo}
              onOpenRecent={handleOpenRecent}
              recentProjects={recentProjects}
            />
          )}
          
          {/* Always render EditorArea but hide when welcome screen is shown */}
          <div style={{ display: showWelcome ? 'none' : 'flex', flex: 1, overflow: 'hidden' }}>
            <EditorArea ref={editorRef} onShowToast={addToast} />
          </div>
          
          {!assistantCollapsed && !showWelcome && (
            <>
              <ResizeHandle onResize={handleAssistantResize} direction="horizontal" />
              <div style={{ 
                width: `${assistantWidth}px`, 
                display: 'flex', 
                flexDirection: 'column',
                background: '#1e1e1e',
                borderLeft: '1px solid #2a2a2a'
              }}>
                {/* Panel Tabs - Scrollable */}
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid #1a1a1a',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  {/* Primary Tabs */}
                  {[
                    { id: 'assistant' as RightPanelMode, label: 'Assistant' },
                    { id: 'openclaw' as RightPanelMode, label: 'OpenClaw' },
                    { id: 'moltbook' as RightPanelMode, label: 'Moltbook' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setRightPanelMode(tab.id)}
                      style={{
                        padding: '10px 14px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: rightPanelMode === tab.id ? '2px solid #FF00FF' : '2px solid transparent',
                        color: rightPanelMode === tab.id ? '#fff' : '#666',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: rightPanelMode === tab.id ? 500 : 400,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                  
                </div>
                
                {/* Panel Content */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {rightPanelMode === 'assistant' && (
                    <AssistantPanel 
                      onCollapse={() => setAssistantCollapsed(true)} 
                      width={assistantWidth}
                      onCreateFile={(name, content, language) => {
                        editorRef.current?.addFile(name, content, language)
                        // Switch to editor view if on welcome screen
                        if (showWelcome) {
                          setShowWelcome(false)
                          try {
                            const userId = userSessionService?.getCurrentUserId?.()
                            if (userId) {
                              sessionStorage.setItem(`bloop-has-project-${userId}`, 'true')
                              localStorage.setItem('bloop-has-project', 'true') // Legacy support
                              userSessionService?.updateActivity?.()
                              window.dispatchEvent(new CustomEvent('bloop:project-activity'))
                            } else {
                              localStorage.setItem('bloop-has-project', 'true')
                            }
                          } catch {
                            localStorage.setItem('bloop-has-project', 'true')
                          }
                        }
                      }}
                    />
                  )}
                  {rightPanelMode === 'openclaw' && (
                    <OpenClawPanel onClose={() => setRightPanelMode('assistant')} />
                  )}
                  {rightPanelMode === 'moltbook' && (
                    <MoltbookPanel 
                      onClose={() => setRightPanelMode('assistant')}
                      onInstallSkill={(skillMd, name) => {
                        openClawService.installSkill(skillMd, name)
                        addToast('success', `Skill "${name}" installed successfully`)
                      }}
                    />
                  )}
                  {rightPanelMode === 'collaboration' && (
                    <CollaborationPanel onClose={() => setRightPanelMode('assistant')} />
                  )}
                  {rightPanelMode === 'agents' && (
                    <AgentInsightsPanel onClose={() => setRightPanelMode('assistant')} />
                  )}
                  {rightPanelMode === 'project' && (
                    <ProjectInsightsPanel onClose={() => setRightPanelMode('assistant')} />
                  )}
                  {rightPanelMode === 'automation' && (
                    <AutomationPanel onClose={() => setRightPanelMode('assistant')} />
                  )}
                  {rightPanelMode === 'plugins' && (
                    <PluginManagementPanel 
                      onClose={() => setRightPanelMode('assistant')}
                      onOpenMarketplace={() => setRightPanelMode('marketplace')}
                    />
                  )}
                  {rightPanelMode === 'marketplace' && (
                    <PluginMarketplacePanel 
                      onClose={() => setRightPanelMode('assistant')}
                      onPluginInstalled={() => {
                        addToast('success', 'Plugin installed successfully')
                        setRightPanelMode('plugins')
                      }}
                    />
                  )}
                  {rightPanelMode === 'workflows' && (
                    <WorkflowTemplatesPanel onClose={() => setRightPanelMode('assistant')} />
                  )}
                  {rightPanelMode === 'teams' && (
                    <TeamOrganizationPanel onClose={() => setRightPanelMode('assistant')} />
                  )}
                  {rightPanelMode === 'shared-agents' && (
                    <SharedAgentsPanel onClose={() => setRightPanelMode('assistant')} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {terminalVisible && (
          <TerminalPanel 
            onClose={() => setTerminalVisible(false)}
            height={terminalHeight}
            onResize={handleTerminalResize}
          />
        )}
      </div>
      
      <StatusBar 
        terminalVisible={terminalVisible}
        onToggleTerminal={() => setTerminalVisible(prev => !prev)}
        onPanelChange={(panel) => {
          setRightPanelMode(panel as RightPanelMode)
          setAssistantCollapsed(false)
        }}
        onShowGitBranch={() => {
          // Switch sidebar to git view
          addToast('info', 'Git panel - Switch branch or view changes')
        }}
        onShowProblems={() => {
          // Show problems panel
          addToast('info', 'Problems panel - View errors and warnings')
        }}
        onShowNotifications={() => {
          // Show notifications
          addToast('info', 'Notifications')
        }}
        onOpenPreferences={() => {
          // Open preferences/settings
          addToast('info', 'Opening preferences...')
        }}
      />
      
      {showCommandPalette && (
        <CommandPalette 
          onClose={() => setShowCommandPalette(false)}
          actions={commandActions}
        />
      )}
      
      <BeginnerGuide />
      
      <Toast 
        toasts={toasts} 
        onRemove={removeToast}
        doNotDisturb={doNotDisturb}
        onToggleDND={() => setDoNotDisturb(prev => !prev)}
        showHistory={showNotificationHistory}
        onShowHistory={() => setShowNotificationHistory(prev => !prev)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
      />
    </div>
  )
}
