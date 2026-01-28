import { useState, useEffect } from 'react'
import { 
  Search, File, Save, FolderOpen, Terminal, 
  Sidebar, PanelRight, Settings, Sun, Moon,
  Copy, Clipboard, Undo, Redo, Search as SearchIcon
} from 'lucide-react'
import { ToastMessage } from './Toast'

interface CommandPaletteProps {
  onClose: () => void
  actions?: {
    toggleSidebar: () => void
    toggleTerminal: () => void
    toggleAssistant: () => void
    showToast: (type: ToastMessage['type'], message: string) => void
  }
}

interface Command {
  id: string
  label: string
  category: string
  icon?: React.ReactNode
  shortcut?: string
  action: () => void
}

export default function CommandPalette({ onClose, actions }: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const commands: Command[] = [
    { 
      id: '1', 
      label: 'New File', 
      category: 'File', 
      icon: <File size={16} />,
      shortcut: 'Ctrl+N', 
      action: () => actions?.showToast('info', 'New file created')
    },
    { 
      id: '2', 
      label: 'Open File', 
      category: 'File', 
      icon: <FolderOpen size={16} />,
      shortcut: 'Ctrl+O', 
      action: () => actions?.showToast('info', 'Open file dialog')
    },
    { 
      id: '3', 
      label: 'Save', 
      category: 'File', 
      icon: <Save size={16} />,
      shortcut: 'Ctrl+S', 
      action: () => actions?.showToast('success', 'File saved successfully')
    },
    { 
      id: '4', 
      label: 'Find', 
      category: 'Edit', 
      icon: <SearchIcon size={16} />,
      shortcut: 'Ctrl+F', 
      action: () => actions?.showToast('info', 'Find dialog opened')
    },
    { 
      id: '5', 
      label: 'Undo', 
      category: 'Edit', 
      icon: <Undo size={16} />,
      shortcut: 'Ctrl+Z', 
      action: () => actions?.showToast('info', 'Undo')
    },
    { 
      id: '6', 
      label: 'Redo', 
      category: 'Edit', 
      icon: <Redo size={16} />,
      shortcut: 'Ctrl+Y', 
      action: () => actions?.showToast('info', 'Redo')
    },
    { 
      id: '7', 
      label: 'Toggle Sidebar', 
      category: 'View', 
      icon: <Sidebar size={16} />,
      shortcut: 'Ctrl+B', 
      action: () => actions?.toggleSidebar()
    },
    { 
      id: '8', 
      label: 'Toggle Terminal', 
      category: 'View', 
      icon: <Terminal size={16} />,
      shortcut: 'Ctrl+`', 
      action: () => actions?.toggleTerminal()
    },
    { 
      id: '9', 
      label: 'Toggle Assistant', 
      category: 'View', 
      icon: <PanelRight size={16} />,
      shortcut: 'Ctrl+Shift+A', 
      action: () => actions?.toggleAssistant()
    },
    { 
      id: '10', 
      label: 'Copy', 
      category: 'Edit', 
      icon: <Copy size={16} />,
      shortcut: 'Ctrl+C', 
      action: () => actions?.showToast('success', 'Copied to clipboard')
    },
    { 
      id: '11', 
      label: 'Paste', 
      category: 'Edit', 
      icon: <Clipboard size={16} />,
      shortcut: 'Ctrl+V', 
      action: () => actions?.showToast('info', 'Pasted from clipboard')
    },
    { 
      id: '12', 
      label: 'Settings', 
      category: 'Preferences', 
      icon: <Settings size={16} />,
      shortcut: 'Ctrl+,', 
      action: () => actions?.showToast('info', 'Settings opened')
    },
  ]

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredCommands, selectedIndex, onClose])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '100px',
        zIndex: 10000
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '560px',
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          borderBottom: '1px solid #2a2a2a'
        }}>
          <Search size={18} style={{ color: '#FF00FF', opacity: 0.8 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#ccc',
              fontSize: '14px',
              outline: 'none',
              fontFamily: "'Inter', sans-serif"
            }}
          />
          <div style={{
            padding: '4px 8px',
            background: '#0a0a0a',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#666',
            fontFamily: 'monospace'
          }}>
            ESC
          </div>
        </div>

        {/* Commands List */}
        <div style={{
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          {filteredCommands.length === 0 ? (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              color: '#666',
              fontSize: '13px'
            }}>
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                onClick={() => {
                  cmd.action()
                  onClose()
                }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: idx === selectedIndex ? 'rgba(255, 0, 255, 0.1)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  borderLeft: idx === selectedIndex ? '2px solid #FF00FF' : '2px solid transparent',
                  transition: 'all 0.1s'
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span style={{ 
                  color: idx === selectedIndex ? '#FF00FF' : '#666',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.1s'
                }}>
                  {cmd.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '13px', 
                    color: idx === selectedIndex ? '#fff' : '#ccc',
                    fontFamily: "'Inter', sans-serif"
                  }}>
                    {cmd.label}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#666',
                    marginTop: '2px'
                  }}>
                    {cmd.category}
                  </div>
                </div>
                {cmd.shortcut && (
                  <div style={{
                    fontSize: '11px',
                    color: '#555',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontFamily: "'Inter', monospace"
                  }}>
                    {cmd.shortcut}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid #2a2a2a',
          display: 'flex',
          gap: '16px',
          fontSize: '11px',
          color: '#555'
        }}>
          <span><kbd style={{ 
            background: '#0a0a0a', 
            padding: '2px 6px', 
            borderRadius: '3px',
            border: '1px solid #2a2a2a'
          }}>↑↓</kbd> Navigate</span>
          <span><kbd style={{ 
            background: '#0a0a0a', 
            padding: '2px 6px', 
            borderRadius: '3px',
            border: '1px solid #2a2a2a'
          }}>↵</kbd> Select</span>
          <span><kbd style={{ 
            background: '#0a0a0a', 
            padding: '2px 6px', 
            borderRadius: '3px',
            border: '1px solid #2a2a2a'
          }}>esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
