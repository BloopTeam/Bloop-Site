import { useState, useEffect, useRef } from 'react'
import Logo from './Logo'
import { Search, Bell, Settings } from 'lucide-react'
import { ToastMessage } from './Toast'

interface MenuBarProps {
  onToggleTerminal?: () => void
  onShowToast?: (type: ToastMessage['type'], message: string) => void
}

interface MenuItem {
  label: string
  shortcut?: string
  divider?: boolean
  disabled?: boolean
}

const menuData: Record<string, MenuItem[]> = {
  File: [
    { label: 'New File', shortcut: 'Ctrl+N' },
    { label: 'New Window', shortcut: 'Ctrl+Shift+N' },
    { label: '', divider: true },
    { label: 'Open File...', shortcut: 'Ctrl+O' },
    { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O' },
    { label: 'Open Recent', shortcut: '→' },
    { label: '', divider: true },
    { label: 'Save', shortcut: 'Ctrl+S' },
    { label: 'Save As...', shortcut: 'Ctrl+Shift+S' },
    { label: 'Save All', shortcut: 'Ctrl+K S' },
    { label: '', divider: true },
    { label: 'Auto Save' },
    { label: 'Preferences', shortcut: '→' },
    { label: '', divider: true },
    { label: 'Close Editor', shortcut: 'Ctrl+W' },
    { label: 'Close Folder', shortcut: 'Ctrl+K F' },
    { label: 'Close Window', shortcut: 'Alt+F4' },
    { label: '', divider: true },
    { label: 'Exit' },
  ],
  Edit: [
    { label: 'Undo', shortcut: 'Ctrl+Z' },
    { label: 'Redo', shortcut: 'Ctrl+Y' },
    { label: '', divider: true },
    { label: 'Cut', shortcut: 'Ctrl+X' },
    { label: 'Copy', shortcut: 'Ctrl+C' },
    { label: 'Paste', shortcut: 'Ctrl+V' },
    { label: '', divider: true },
    { label: 'Find', shortcut: 'Ctrl+F' },
    { label: 'Replace', shortcut: 'Ctrl+H' },
    { label: '', divider: true },
    { label: 'Find in Files', shortcut: 'Ctrl+Shift+F' },
    { label: 'Replace in Files', shortcut: 'Ctrl+Shift+H' },
    { label: '', divider: true },
    { label: 'Toggle Line Comment', shortcut: 'Ctrl+/' },
    { label: 'Toggle Block Comment', shortcut: 'Ctrl+Shift+/' },
    { label: 'Emmet: Expand Abbreviation', shortcut: 'Tab' },
  ],
  View: [
    { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P' },
    { label: 'Open View...', shortcut: 'Ctrl+Q' },
    { label: '', divider: true },
    { label: 'Appearance', shortcut: '→' },
    { label: 'Editor Layout', shortcut: '→' },
    { label: '', divider: true },
    { label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
    { label: 'Search', shortcut: 'Ctrl+Shift+F' },
    { label: 'Source Control', shortcut: 'Ctrl+Shift+G' },
    { label: 'Run and Debug', shortcut: 'Ctrl+Shift+D' },
    { label: 'Extensions', shortcut: 'Ctrl+Shift+X' },
    { label: '', divider: true },
    { label: 'Problems', shortcut: 'Ctrl+Shift+M' },
    { label: 'Output', shortcut: 'Ctrl+Shift+U' },
    { label: 'Debug Console', shortcut: 'Ctrl+Shift+Y' },
    { label: 'Terminal', shortcut: 'Ctrl+`' },
    { label: '', divider: true },
    { label: 'Word Wrap', shortcut: 'Alt+Z' },
  ],
  Go: [
    { label: 'Back', shortcut: 'Alt+←' },
    { label: 'Forward', shortcut: 'Alt+→' },
    { label: 'Last Edit Location', shortcut: 'Ctrl+K Ctrl+Q' },
    { label: '', divider: true },
    { label: 'Go to File...', shortcut: 'Ctrl+P' },
    { label: 'Go to Symbol in Workspace...', shortcut: 'Ctrl+T' },
    { label: '', divider: true },
    { label: 'Go to Symbol in Editor...', shortcut: 'Ctrl+Shift+O' },
    { label: 'Go to Definition', shortcut: 'F12' },
    { label: 'Go to Declaration' },
    { label: 'Go to Type Definition' },
    { label: 'Go to Implementations', shortcut: 'Ctrl+F12' },
    { label: 'Go to References', shortcut: 'Shift+F12' },
    { label: '', divider: true },
    { label: 'Go to Line/Column...', shortcut: 'Ctrl+G' },
    { label: 'Go to Bracket', shortcut: 'Ctrl+Shift+\\' },
  ],
  Run: [
    { label: 'Start Debugging', shortcut: 'F5' },
    { label: 'Run Without Debugging', shortcut: 'Ctrl+F5' },
    { label: 'Stop Debugging', shortcut: 'Shift+F5' },
    { label: 'Restart Debugging', shortcut: 'Ctrl+Shift+F5' },
    { label: '', divider: true },
    { label: 'Open Configurations' },
    { label: 'Add Configuration...' },
    { label: '', divider: true },
    { label: 'Step Over', shortcut: 'F10' },
    { label: 'Step Into', shortcut: 'F11' },
    { label: 'Step Out', shortcut: 'Shift+F11' },
    { label: 'Continue', shortcut: 'F5' },
    { label: '', divider: true },
    { label: 'Toggle Breakpoint', shortcut: 'F9' },
    { label: 'New Breakpoint', shortcut: '→' },
  ],
  Terminal: [
    { label: 'New Terminal', shortcut: 'Ctrl+Shift+`' },
    { label: 'Split Terminal', shortcut: 'Ctrl+Shift+5' },
    { label: '', divider: true },
    { label: 'Run Task...' },
    { label: 'Run Build Task...', shortcut: 'Ctrl+Shift+B' },
    { label: 'Run Active File' },
    { label: 'Run Selected Text' },
    { label: '', divider: true },
    { label: 'Configure Tasks...' },
    { label: 'Configure Default Build Task...' },
  ],
  Help: [
    { label: 'Welcome' },
    { label: 'Show All Commands', shortcut: 'Ctrl+Shift+P' },
    { label: 'Documentation' },
    { label: 'Release Notes' },
    { label: '', divider: true },
    { label: 'Keyboard Shortcuts Reference', shortcut: 'Ctrl+K Ctrl+R' },
    { label: 'Video Tutorials' },
    { label: 'Tips and Tricks' },
    { label: '', divider: true },
    { label: 'Join Us on Twitter' },
    { label: 'Join Us on Discord' },
    { label: 'Report Issue' },
    { label: '', divider: true },
    { label: 'Check for Updates...' },
    { label: '', divider: true },
    { label: 'About' },
  ],
}

export default function MenuBar(): JSX.Element {
  const menuItems = ['File', 'Edit', 'View', 'Go', 'Run', 'Terminal', 'Help']
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [hoveredDropdownItem, setHoveredDropdownItem] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMenuClick = (item: string) => {
    if (activeMenu === item) {
      setActiveMenu(null)
    } else {
      setActiveMenu(item)
    }
  }

  const handleMenuHover = (item: string) => {
    setHoveredItem(item)
    if (activeMenu) {
      setActiveMenu(item)
    }
  }

  return (
    <div style={{
      height: '40px',
      background: '#000000',
      borderBottom: '1px solid #1a1a1a',
      display: 'flex',
      alignItems: 'center',
      padding: '0 0 0 16px',
      fontSize: '12px',
      userSelect: 'none',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontWeight: 600,
      letterSpacing: '0.02em',
      position: 'relative',
      zIndex: 1000
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '48px',
        marginLeft: '-16px',
        marginRight: '0',
        borderRight: '1px solid #1a1a1a',
        height: '100%'
      }}>
        <Logo size={22} />
      </div>

      <div ref={menuRef} style={{ display: 'flex', gap: '1px', alignItems: 'center', height: '100%' }}>
        {menuItems.map((item) => {
          const isActive = activeMenu === item
          const isHovered = hoveredItem === item
          
          return (
            <div key={item} style={{ position: 'relative', height: '100%' }}>
              <button
                onClick={() => handleMenuClick(item)}
                onMouseEnter={() => handleMenuHover(item)}
                onMouseLeave={() => !activeMenu && setHoveredItem(null)}
                style={{
                  padding: '0 16px',
                  background: isActive ? 'rgba(255, 0, 255, 0.2)' : (isHovered ? 'rgba(255, 0, 255, 0.15)' : 'transparent'),
                  border: 'none',
                  color: isActive || isHovered ? '#FF00FF' : '#707070',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: isActive || isHovered ? 700 : 600,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  letterSpacing: '0.03em',
                  transition: 'all 0.15s',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  textTransform: 'uppercase'
                }}
              >
                {item}
                {(isActive || isHovered) && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: '#FF00FF',
                    boxShadow: '0 0 8px rgba(255, 0, 255, 0.8)'
                  }} />
                )}
              </button>

              {/* Dropdown Menu */}
              {isActive && menuData[item] && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  padding: '4px 0',
                  minWidth: '240px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                  zIndex: 1001
                }}>
                  {menuData[item].map((menuItem, idx) => {
                    if (menuItem.divider) {
                      return (
                        <div
                          key={idx}
                          style={{
                            height: '1px',
                            background: '#2a2a2a',
                            margin: '4px 0'
                          }}
                        />
                      )
                    }

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredDropdownItem(idx)}
                        onMouseLeave={() => setHoveredDropdownItem(null)}
                        onClick={() => {
                          if (!menuItem.disabled) {
                            setActiveMenu(null)
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 16px',
                          cursor: menuItem.disabled ? 'default' : 'pointer',
                          background: hoveredDropdownItem === idx ? 'rgba(255, 0, 255, 0.15)' : 'transparent',
                          color: menuItem.disabled ? '#555' : (hoveredDropdownItem === idx ? '#FF00FF' : '#cccccc'),
                          fontSize: '12px',
                          fontWeight: 400,
                          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          letterSpacing: '0.01em',
                          textTransform: 'none',
                          transition: 'all 0.1s'
                        }}
                      >
                        <span>{menuItem.label}</span>
                        {menuItem.shortcut && (
                          <span style={{
                            color: '#707070',
                            fontSize: '11px',
                            marginLeft: '24px',
                            fontFamily: "'Inter', monospace"
                          }}>
                            {menuItem.shortcut}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      <div style={{ flex: 1 }} />
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 12px',
        background: searchFocused ? '#0f0f0f' : '#0a0a0a',
        border: `2px solid ${searchFocused ? '#FF00FF' : '#1a1a1a'}`,
        borderRadius: '0',
        minWidth: '280px',
        transition: 'all 0.2s',
        boxShadow: searchFocused ? '0 0 12px rgba(255, 0, 255, 0.3)' : 'none',
        marginRight: '16px'
      }}>
        <Search size={15} style={{ color: searchFocused ? '#FF00FF' : '#707070', flexShrink: 0, transition: 'color 0.2s' }} />
        <input
          type="text"
          placeholder="Search..."
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e0e0e0',
            fontSize: '12px',
            flex: 1,
            width: '100%',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 500,
            letterSpacing: '0.01em'
          }}
        />
        <div style={{
          padding: '2px 6px',
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '2px',
          fontSize: '9px',
          color: '#707070',
          fontFamily: 'monospace',
          fontWeight: 600,
          letterSpacing: '0.1em'
        }}>⌘K</div>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginLeft: '16px',
        paddingLeft: '16px',
        borderLeft: '2px solid #1a1a1a',
        height: '100%'
      }}>
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: '#707070',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '0',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s',
            height: '100%'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FF00FF'
            e.currentTarget.style.background = 'rgba(255, 0, 255, 0.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#707070'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <Bell size={16} strokeWidth={2} />
        </button>
        
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: '#707070',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '0',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s',
            height: '100%'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FF00FF'
            e.currentTarget.style.background = 'rgba(255, 0, 255, 0.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#707070'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <Settings size={16} strokeWidth={2} />
        </button>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          marginLeft: '8px'
        }}>
          <div style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: '#22c55e'
          }} />
        </div>
      </div>
    </div>
  )
}
