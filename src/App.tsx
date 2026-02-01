import React, { useState, useEffect, useCallback } from 'react'
import MenuBar from './components/MenuBar'
import LeftSidebar from './components/LeftSidebar'
import EditorArea from './components/EditorArea'
import AssistantPanel from './components/AssistantPanel'
import StatusBar from './components/StatusBar'
import CommandPalette from './components/CommandPalette'
import BeginnerGuide from './components/BeginnerGuide'
import ResizeHandle from './components/ResizeHandle'
import Toast, { ToastMessage } from './components/Toast'
import TerminalPanel from './components/TerminalPanel'
import OpenClawPanel from './components/OpenClawPanel'
import MoltbookPanel from './components/MoltbookPanel'
import { openClawService } from './services/openclaw'

// Right panel modes
type RightPanelMode = 'assistant' | 'openclaw' | 'moltbook'

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

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [addToast])

  // Command palette actions
  const commandActions = {
    toggleSidebar: () => setSidebarCollapsed(prev => !prev),
    toggleTerminal: () => setTerminalVisible(prev => !prev),
    toggleAssistant: () => setAssistantCollapsed(prev => !prev),
    showToast: (type: ToastMessage['type'], message: string) => addToast(type, message),
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
        onShowToast={addToast}
      />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {!sidebarCollapsed && (
            <>
              <LeftSidebar 
                onCollapse={() => setSidebarCollapsed(true)} 
                width={sidebarWidth}
                onShowToast={addToast}
              />
              <ResizeHandle onResize={handleSidebarResize} direction="horizontal" />
            </>
          )}
          
          <EditorArea onShowToast={addToast} />
          
          {!assistantCollapsed && (
            <>
              <ResizeHandle onResize={handleAssistantResize} direction="horizontal" />
              <div style={{ 
                width: `${assistantWidth}px`, 
                display: 'flex', 
                flexDirection: 'column',
                background: '#1e1e1e',
                borderLeft: '1px solid #3c3c3c'
              }}>
                {/* Panel Tabs */}
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid #3c3c3c',
                  background: '#252526'
                }}>
                  <button
                    onClick={() => setRightPanelMode('assistant')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: rightPanelMode === 'assistant' ? '#1e1e1e' : 'transparent',
                      border: 'none',
                      borderBottom: rightPanelMode === 'assistant' ? '2px solid #FF00FF' : '2px solid transparent',
                      color: rightPanelMode === 'assistant' ? '#ffffff' : '#888888',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    Assistant
                  </button>
                  <button
                    onClick={() => setRightPanelMode('openclaw')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: rightPanelMode === 'openclaw' ? '#1e1e1e' : 'transparent',
                      border: 'none',
                      borderBottom: rightPanelMode === 'openclaw' ? '2px solid #22c55e' : '2px solid transparent',
                      color: rightPanelMode === 'openclaw' ? '#ffffff' : '#888888',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    OpenClaw
                  </button>
                  <button
                    onClick={() => setRightPanelMode('moltbook')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: rightPanelMode === 'moltbook' ? '#1e1e1e' : 'transparent',
                      border: 'none',
                      borderBottom: rightPanelMode === 'moltbook' ? '2px solid #a855f7' : '2px solid transparent',
                      color: rightPanelMode === 'moltbook' ? '#ffffff' : '#888888',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    Moltbook
                  </button>
                </div>
                
                {/* Panel Content */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {rightPanelMode === 'assistant' && (
                    <AssistantPanel onCollapse={() => setAssistantCollapsed(true)} width={assistantWidth} />
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
