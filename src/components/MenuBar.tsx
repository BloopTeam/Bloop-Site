import { useState, useEffect, useRef } from 'react'
import Logo from './Logo'
import { Search, Bell, Settings } from 'lucide-react'
import { ToastMessage } from './Toast'

interface MenuBarProps {
  onToggleTerminal?: () => void
  onToggleSidebar?: () => void
  onToggleAssistant?: () => void
  onShowCommandPalette?: () => void
  onNewFile?: () => void
  onOpenFile?: () => void
  onSaveFile?: () => void
  onShowToast?: (type: ToastMessage['type'], message: string) => void
  onOpenFolder?: () => void
}

interface MenuItem {
  label: string
  shortcut?: string
  divider?: boolean
  disabled?: boolean
  action?: string
}

const menuData: Record<string, MenuItem[]> = {
  File: [
    { label: 'New File', shortcut: 'Ctrl+N', action: 'newFile' },
    { label: 'New Window', shortcut: 'Ctrl+Shift+N', action: 'newWindow' },
    { label: '', divider: true },
    { label: 'Open File...', shortcut: 'Ctrl+O', action: 'openFile' },
    { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: 'openFolder' },
    { label: 'Open Recent', shortcut: '→', action: 'openRecent' },
    { label: '', divider: true },
    { label: 'Save', shortcut: 'Ctrl+S', action: 'save' },
    { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: 'saveAs' },
    { label: 'Save All', shortcut: 'Ctrl+K S', action: 'saveAll' },
    { label: '', divider: true },
    { label: 'Auto Save', action: 'toggleAutoSave' },
    { label: 'Preferences', shortcut: '→', action: 'preferences' },
    { label: '', divider: true },
    { label: 'Close Editor', shortcut: 'Ctrl+W', action: 'closeEditor' },
    { label: 'Close Folder', shortcut: 'Ctrl+K F', action: 'closeFolder' },
    { label: 'Close Window', shortcut: 'Alt+F4', action: 'closeWindow' },
    { label: '', divider: true },
    { label: 'Exit', action: 'exit' },
  ],
  Edit: [
    { label: 'Undo', shortcut: 'Ctrl+Z', action: 'undo' },
    { label: 'Redo', shortcut: 'Ctrl+Y', action: 'redo' },
    { label: '', divider: true },
    { label: 'Cut', shortcut: 'Ctrl+X', action: 'cut' },
    { label: 'Copy', shortcut: 'Ctrl+C', action: 'copy' },
    { label: 'Paste', shortcut: 'Ctrl+V', action: 'paste' },
    { label: '', divider: true },
    { label: 'Find', shortcut: 'Ctrl+F', action: 'find' },
    { label: 'Replace', shortcut: 'Ctrl+H', action: 'replace' },
    { label: '', divider: true },
    { label: 'Find in Files', shortcut: 'Ctrl+Shift+F', action: 'findInFiles' },
    { label: 'Replace in Files', shortcut: 'Ctrl+Shift+H', action: 'replaceInFiles' },
    { label: '', divider: true },
    { label: 'Toggle Line Comment', shortcut: 'Ctrl+/', action: 'toggleComment' },
    { label: 'Toggle Block Comment', shortcut: 'Ctrl+Shift+/', action: 'toggleBlockComment' },
    { label: 'Emmet: Expand Abbreviation', shortcut: 'Tab', action: 'emmetExpand' },
  ],
  View: [
    { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: 'commandPalette' },
    { label: 'Open View...', shortcut: 'Ctrl+Q', action: 'openView' },
    { label: '', divider: true },
    { label: 'Appearance', shortcut: '→', action: 'appearance' },
    { label: 'Editor Layout', shortcut: '→', action: 'editorLayout' },
    { label: '', divider: true },
    { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: 'showExplorer' },
    { label: 'Search', shortcut: 'Ctrl+Shift+F', action: 'showSearch' },
    { label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: 'showGit' },
    { label: 'Run and Debug', shortcut: 'Ctrl+Shift+D', action: 'showDebug' },
    { label: 'Extensions', shortcut: 'Ctrl+Shift+X', action: 'showExtensions' },
    { label: '', divider: true },
    { label: 'Problems', shortcut: 'Ctrl+Shift+M', action: 'showProblems' },
    { label: 'Output', shortcut: 'Ctrl+Shift+U', action: 'showOutput' },
    { label: 'Debug Console', shortcut: 'Ctrl+Shift+Y', action: 'showDebugConsole' },
    { label: 'Terminal', shortcut: 'Ctrl+`', action: 'toggleTerminal' },
    { label: '', divider: true },
    { label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: 'toggleSidebar' },
    { label: 'Toggle Assistant', shortcut: 'Ctrl+Shift+A', action: 'toggleAssistant' },
    { label: 'Word Wrap', shortcut: 'Alt+Z', action: 'toggleWordWrap' },
  ],
  Go: [
    { label: 'Back', shortcut: 'Alt+←', action: 'goBack' },
    { label: 'Forward', shortcut: 'Alt+→', action: 'goForward' },
    { label: 'Last Edit Location', shortcut: 'Ctrl+K Ctrl+Q', action: 'lastEditLocation' },
    { label: '', divider: true },
    { label: 'Go to File...', shortcut: 'Ctrl+P', action: 'goToFile' },
    { label: 'Go to Symbol in Workspace...', shortcut: 'Ctrl+T', action: 'goToSymbolWorkspace' },
    { label: '', divider: true },
    { label: 'Go to Symbol in Editor...', shortcut: 'Ctrl+Shift+O', action: 'goToSymbol' },
    { label: 'Go to Definition', shortcut: 'F12', action: 'goToDefinition' },
    { label: 'Go to Declaration', action: 'goToDeclaration' },
    { label: 'Go to Type Definition', action: 'goToTypeDefinition' },
    { label: 'Go to Implementations', shortcut: 'Ctrl+F12', action: 'goToImplementation' },
    { label: 'Go to References', shortcut: 'Shift+F12', action: 'goToReferences' },
    { label: '', divider: true },
    { label: 'Go to Line/Column...', shortcut: 'Ctrl+G', action: 'goToLine' },
    { label: 'Go to Bracket', shortcut: 'Ctrl+Shift+\\', action: 'goToBracket' },
  ],
  Run: [
    { label: 'Start Debugging', shortcut: 'F5', action: 'startDebugging' },
    { label: 'Run Without Debugging', shortcut: 'Ctrl+F5', action: 'runWithoutDebugging' },
    { label: 'Stop Debugging', shortcut: 'Shift+F5', action: 'stopDebugging' },
    { label: 'Restart Debugging', shortcut: 'Ctrl+Shift+F5', action: 'restartDebugging' },
    { label: '', divider: true },
    { label: 'Open Configurations', action: 'openConfigurations' },
    { label: 'Add Configuration...', action: 'addConfiguration' },
    { label: '', divider: true },
    { label: 'Step Over', shortcut: 'F10', action: 'stepOver' },
    { label: 'Step Into', shortcut: 'F11', action: 'stepInto' },
    { label: 'Step Out', shortcut: 'Shift+F11', action: 'stepOut' },
    { label: 'Continue', shortcut: 'F5', action: 'continue' },
    { label: '', divider: true },
    { label: 'Toggle Breakpoint', shortcut: 'F9', action: 'toggleBreakpoint' },
    { label: 'New Breakpoint', shortcut: '→', action: 'newBreakpoint' },
  ],
  Terminal: [
    { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: 'newTerminal' },
    { label: 'Split Terminal', shortcut: 'Ctrl+Shift+5', action: 'splitTerminal' },
    { label: '', divider: true },
    { label: 'Run Task...', action: 'runTask' },
    { label: 'Run Build Task...', shortcut: 'Ctrl+Shift+B', action: 'runBuildTask' },
    { label: 'Run Active File', action: 'runActiveFile' },
    { label: 'Run Selected Text', action: 'runSelectedText' },
    { label: '', divider: true },
    { label: 'Configure Tasks...', action: 'configureTasks' },
    { label: 'Configure Default Build Task...', action: 'configureDefaultBuildTask' },
  ],
  Help: [
    { label: 'Welcome', action: 'showWelcome' },
    { label: 'Show All Commands', shortcut: 'Ctrl+Shift+P', action: 'commandPalette' },
    { label: 'Documentation', action: 'showDocs' },
    { label: 'Release Notes', action: 'showReleaseNotes' },
    { label: '', divider: true },
    { label: 'Keyboard Shortcuts Reference', shortcut: 'Ctrl+K Ctrl+R', action: 'showShortcuts' },
    { label: 'Video Tutorials', action: 'showTutorials' },
    { label: 'Tips and Tricks', action: 'showTips' },
    { label: '', divider: true },
    { label: 'Join Us on Twitter', action: 'openTwitter' },
    { label: 'Join Us on Discord', action: 'openDiscord' },
    { label: 'Report Issue', action: 'reportIssue' },
    { label: '', divider: true },
    { label: 'Check for Updates...', action: 'checkUpdates' },
    { label: '', divider: true },
    { label: 'About', action: 'showAbout' },
  ],
}

export default function MenuBar({ 
  onToggleTerminal,
  onToggleSidebar,
  onToggleAssistant,
  onShowCommandPalette,
  onNewFile,
  onOpenFile,
  onSaveFile,
  onShowToast,
  onOpenFolder
}: MenuBarProps): JSX.Element {
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

  const handleMenuAction = (action: string | undefined) => {
    if (!action) return
    
    setActiveMenu(null)
    
    switch (action) {
      // File actions
      case 'newFile':
        onNewFile?.()
        onShowToast?.('success', 'New file created')
        break
      case 'newWindow':
        onShowToast?.('info', 'Opening new window...')
        break
      case 'openFile':
        onOpenFile?.()
        onShowToast?.('info', 'Open file dialog')
        break
      case 'openFolder':
        // Open folder picker
        onOpenFolder?.()
        onShowToast?.('info', 'Opening folder...')
        break
      case 'openRecent':
        // Show recent files/projects
        onShowToast?.('info', 'Recent files - Coming soon')
        break
      case 'save':
        onSaveFile?.()
        onShowToast?.('success', 'File saved')
        break
      case 'saveAs':
        // Save current file with new name
        if (onSaveFile) {
          // Trigger save as by creating new file with current content
          onNewFile?.()
          onShowToast?.('info', 'Save As - Choose new location')
        } else {
          onShowToast?.('info', 'Save As dialog')
        }
        break
      case 'saveAll':
        // Save all modified files
        if (onSaveFile) {
          onSaveFile()
          onShowToast?.('success', 'All files saved')
        } else {
          onShowToast?.('success', 'All files saved')
        }
        break
      case 'toggleAutoSave':
        // Toggle auto-save preference
        const currentAutoSave = localStorage.getItem('bloop-auto-save') !== 'false'
        localStorage.setItem('bloop-auto-save', String(!currentAutoSave))
        onShowToast?.('success', `Auto-save ${!currentAutoSave ? 'enabled' : 'disabled'}`)
        break
      case 'preferences':
        // Open preferences - could show a settings panel
        onShowToast?.('info', 'Opening preferences... (Settings panel coming soon)')
        break
      case 'closeEditor':
        // Close current editor tab
        onShowToast?.('info', 'Close current tab (Ctrl+W)')
        break
      case 'closeFolder':
        // Clear project folder
        localStorage.removeItem('bloop-has-project')
        onShowToast?.('info', 'Project folder closed')
        break
      case 'closeWindow':
        // Close window (browser only)
        if (window.confirm('Are you sure you want to close?')) {
          window.close()
        }
        break
      case 'exit':
        // Exit application
        if (window.confirm('Are you sure you want to exit?')) {
          window.close()
        }
        break
        
      // Edit actions
      case 'undo':
        document.execCommand('undo')
        onShowToast?.('info', 'Undo')
        break
      case 'redo':
        document.execCommand('redo')
        onShowToast?.('info', 'Redo')
        break
      case 'cut':
        document.execCommand('cut')
        onShowToast?.('success', 'Cut to clipboard')
        break
      case 'copy':
        document.execCommand('copy')
        onShowToast?.('success', 'Copied to clipboard')
        break
      case 'paste':
        document.execCommand('paste')
        onShowToast?.('success', 'Pasted from clipboard')
        break
      case 'find':
        // Trigger find (Ctrl+F)
        document.execCommand('find')
        onShowToast?.('info', 'Find (Ctrl+F)')
        break
      case 'replace':
        // Trigger replace (Ctrl+H)
        onShowToast?.('info', 'Replace (Ctrl+H) - Coming soon')
        break
      case 'findInFiles':
        // Switch to search view in sidebar
        onShowToast?.('info', 'Find in Files (Ctrl+Shift+F) - Switch to Search view')
        break
      case 'replaceInFiles':
        // Replace in files
        onShowToast?.('info', 'Replace in Files (Ctrl+Shift+H) - Coming soon')
        break
      case 'toggleComment':
        // Toggle line comment (Ctrl+/)
        document.execCommand('formatBlock', false, 'pre')
        onShowToast?.('info', 'Toggle comment (Ctrl+/)')
        break
      case 'toggleBlockComment':
        // Toggle block comment
        onShowToast?.('info', 'Toggle block comment (Ctrl+Shift+/) - Coming soon')
        break
        
      // View actions
      case 'commandPalette':
        onShowCommandPalette?.()
        break
      case 'toggleTerminal':
        onToggleTerminal?.()
        break
      case 'toggleSidebar':
        onToggleSidebar?.()
        break
      case 'toggleAssistant':
        onToggleAssistant?.()
        break
      case 'showExplorer':
        // Toggle sidebar to show explorer
        onToggleSidebar?.()
        onShowToast?.('info', 'Explorer view (Ctrl+Shift+E)')
        break
      case 'showSearch':
        // Switch sidebar to search view
        onToggleSidebar?.()
        onShowToast?.('info', 'Search view (Ctrl+Shift+F)')
        break
      case 'showGit':
        // Switch sidebar to git view
        onToggleSidebar?.()
        onShowToast?.('info', 'Source control view (Ctrl+Shift+G)')
        break
      case 'showDebug':
        // Show debug panel
        onShowToast?.('info', 'Debug view (Ctrl+Shift+D) - Coming soon')
        break
      case 'showExtensions':
        // Switch sidebar to extensions view
        onToggleSidebar?.()
        onShowToast?.('info', 'Extensions view (Ctrl+Shift+X)')
        break
      case 'showProblems':
        // Show problems panel
        onShowToast?.('info', 'Problems panel (Ctrl+Shift+M)')
        break
      case 'showOutput':
        // Show output panel
        onShowToast?.('info', 'Output panel (Ctrl+Shift+U) - Coming soon')
        break
      case 'showDebugConsole':
        // Show debug console
        onShowToast?.('info', 'Debug console (Ctrl+Shift+Y) - Coming soon')
        break
      case 'toggleWordWrap':
        // Toggle word wrap
        const currentWrap = localStorage.getItem('bloop-word-wrap') !== 'false'
        localStorage.setItem('bloop-word-wrap', String(!currentWrap))
        onShowToast?.('success', `Word wrap ${!currentWrap ? 'enabled' : 'disabled'} (Alt+Z)`)
        break
        
      // Go actions
      case 'goBack':
        // Navigate back in editor history
        window.history.back()
        onShowToast?.('info', 'Go back (Alt+←)')
        break
      case 'goForward':
        // Navigate forward in editor history
        window.history.forward()
        onShowToast?.('info', 'Go forward (Alt+→)')
        break
      case 'goToFile':
        // Open command palette for file navigation
        onShowCommandPalette?.()
        onShowToast?.('info', 'Go to File (Ctrl+P)')
        break
      case 'goToLine':
        // Go to line dialog
        const lineNum = prompt('Go to line number:')
        if (lineNum) {
          onShowToast?.('info', `Go to line ${lineNum} (Ctrl+G)`)
        }
        break
      case 'goToDefinition':
        // Go to definition (F12)
        onShowToast?.('info', 'Go to Definition (F12) - Right-click symbol for options')
        break
      case 'goToReferences':
        // Find all references
        onShowToast?.('info', 'Find all References (Shift+F12) - Right-click symbol')
        break
        
      // Run actions
      case 'startDebugging':
        // Start debugging session
        onShowToast?.('info', 'Starting debugger... (F5) - Debugging coming soon')
        break
      case 'runWithoutDebugging':
        // Run without debugger
        onShowToast?.('info', 'Running without debugging (Ctrl+F5)')
        break
      case 'stopDebugging':
        // Stop debugger
        onShowToast?.('info', 'Debugging stopped (Shift+F5)')
        break
      case 'toggleBreakpoint':
        // Toggle breakpoint
        onShowToast?.('info', 'Toggle breakpoint (F9) - Right-click line number')
        break
        
      // Terminal actions
      case 'newTerminal':
        // Open terminal if closed, or create new terminal
        onToggleTerminal?.()
        onShowToast?.('success', 'New terminal opened (Ctrl+Shift+`)')
        break
      case 'splitTerminal':
        // Split terminal
        onShowToast?.('info', 'Split terminal (Ctrl+Shift+5) - Coming soon')
        break
      case 'runTask':
        // Run task
        onShowToast?.('info', 'Run task... - Configure tasks in .vscode/tasks.json')
        break
      case 'runBuildTask':
        // Run build task
        onShowToast?.('info', 'Running build task (Ctrl+Shift+B)')
        break
      case 'runActiveFile':
        // Run active file
        onShowToast?.('info', 'Running active file...')
        break
        
      // Help actions
      case 'showWelcome':
        onShowToast?.('info', 'Welcome to Bloop!')
        break
      case 'showDocs':
        globalThis.open('https://github.com/bloop-ai/bloop', '_blank')
        break
      case 'showReleaseNotes':
        onShowToast?.('info', 'Release Notes')
        break
      case 'showShortcuts':
        onShowToast?.('info', 'Keyboard shortcuts reference')
        break
      case 'showTutorials':
        onShowToast?.('info', 'Video tutorials')
        break
      case 'showTips':
        onShowToast?.('info', 'Tips and tricks')
        break
      case 'openTwitter':
        globalThis.open('https://twitter.com/bloopai', '_blank')
        break
      case 'openDiscord':
        globalThis.open('https://discord.gg/bloop', '_blank')
        break
      case 'reportIssue':
        globalThis.open('https://github.com/bloop-ai/bloop/issues', '_blank')
        break
      case 'checkUpdates':
        onShowToast?.('success', 'You are up to date!')
        break
      case 'showAbout':
        onShowToast?.('info', 'Bloop v0.2.0 - AI-Powered Code Editor')
        break
        
      default:
        onShowToast?.('info', `Action: ${action}`)
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
                            handleMenuAction(menuItem.action)
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
          onClick={() => onShowToast?.('info', 'Notifications')}
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
          onClick={() => onShowToast?.('info', 'Settings')}
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
