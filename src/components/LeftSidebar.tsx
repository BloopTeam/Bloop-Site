import { useState, useEffect } from 'react'
import { 
  Search, GitBranch, Settings, Box, Bug, Play, Brain, Shield,
  ChevronRight, ChevronDown, FileCode, FileText, Folder,
  File, FolderPlus, Trash2, Copy, Edit3, Plus, RefreshCw,
  Check, GitCommit, Download, Star, ChevronsDownUp, ChevronsUpDown, Eye,
  Code, Wand2, AlertCircle, Zap, Palette, Power
} from 'lucide-react'
import ContextMenu, { ContextMenuItem } from './ContextMenu'
import { ToastMessage } from './Toast'
import Logo from './Logo'
import GitView from './GitView'
import { CodeIntelligencePanel } from './CodeIntelligencePanel'
import { SecurityDashboard } from './SecurityDashboard'
import { extensionsService, type Extension } from '../services/extensions'
import { userSessionService } from '../services/userSession'
import * as LucideIcons from 'lucide-react'

interface LeftSidebarProps {
  onCollapse: () => void
  width?: number
  onShowToast?: (type: ToastMessage['type'], message: string) => void
  onCreateNewFile?: () => void
  onCreateNewFolder?: () => void
  onOpenFolder?: () => void
  onSwitchRightPanel?: (mode: string) => void
}

type SidebarView = 'explorer' | 'search' | 'codeintel' | 'security' | 'git' | 'debug' | 'extensions' | 'platform'

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  target: { name: string; isFolder: boolean } | null
}

interface GitChange {
  file: string
  status: 'modified' | 'added' | 'deleted'
}

export default function LeftSidebar({ width = 280, onShowToast, onCreateNewFile, onCreateNewFolder, onOpenFolder, onSwitchRightPanel }: LeftSidebarProps) {
  const [activeView, setActiveView] = useState<SidebarView>('explorer')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    target: null
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ file: string; line: number; text: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hoveredFile, setHoveredFile] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<{ name: string; path: string[] } | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([])
  
  // Start with no git changes - user's actual changes will show here
  const [gitChanges] = useState<GitChange[]>([])

  // Initialize user session for multi-user support
  useEffect(() => {
    try {
      // Only initialize if not already initialized
      if (!userSessionService.getCurrentUserId()) {
        userSessionService.initializeSession()
      }
    } catch (error) {
      console.warn('Failed to initialize user session in LeftSidebar:', error)
    }
  }, [])

  // Load extensions from service
  const [extensions, setExtensions] = useState<Extension[]>(extensionsService.getAllExtensions())
  const [extensionSearchQuery, setExtensionSearchQuery] = useState('')

  // Filter extensions by search query
  const filteredExtensions = extensions.filter(ext => 
    ext.name.toLowerCase().includes(extensionSearchQuery.toLowerCase()) ||
    ext.description.toLowerCase().includes(extensionSearchQuery.toLowerCase()) ||
    ext.author.toLowerCase().includes(extensionSearchQuery.toLowerCase())
  )

  const handleInstallExtension = async (extensionId: string) => {
    try {
      await extensionsService.installExtension(extensionId)
      setExtensions([...extensionsService.getAllExtensions()])
      onShowToast?.('success', `Installed ${extensionsService.getExtension(extensionId)?.name}`)
    } catch (error) {
      onShowToast?.('error', 'Failed to install extension')
    }
  }

  const handleUninstallExtension = async (extensionId: string) => {
    try {
      await extensionsService.uninstallExtension(extensionId)
      setExtensions([...extensionsService.getAllExtensions()])
      onShowToast?.('success', `Uninstalled ${extensionsService.getExtension(extensionId)?.name}`)
    } catch (error) {
      onShowToast?.('error', 'Failed to uninstall extension')
    }
  }

  const handleToggleExtension = async (extensionId: string, enabled: boolean) => {
    try {
      await extensionsService.toggleExtension(extensionId, enabled)
      setExtensions([...extensionsService.getAllExtensions()])
      onShowToast?.('success', `${enabled ? 'Enabled' : 'Disabled'} ${extensionsService.getExtension(extensionId)?.name}`)
    } catch (error) {
      onShowToast?.('error', 'Failed to toggle extension')
    }
  }

  const handleExecuteCommand = async (extensionId: string, commandId: string) => {
    try {
      await extensionsService.executeCommand(extensionId, commandId)
      const ext = extensionsService.getExtension(extensionId)
      const cmd = ext?.commands?.find(c => c.id === commandId)
      if (cmd) {
        onShowToast?.('success', `Executed: ${cmd.label}`)
      }
    } catch (error) {
      onShowToast?.('error', 'Failed to execute command')
    }
  }

  const getExtensionIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || Box
    return <IconComponent size={16} />
  }

  const toggleFolder = (folder: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder)
    } else {
      newExpanded.add(folder)
    }
    setExpandedFolders(newExpanded)
  }

  const expandAll = () => {
    const getAllFolders = (items: any[]): string[] => {
      const folders: string[] = []
      items.forEach(item => {
        if (item.type === 'folder') {
          folders.push(item.name)
          if (item.children) {
            folders.push(...getAllFolders(item.children))
          }
        }
      })
      return folders
    }
    setExpandedFolders(new Set(getAllFolders(fileTree)))
  }

  const collapseAll = () => {
    setExpandedFolders(new Set())
    onShowToast?.('info', 'All folders collapsed')
  }

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    const iconMap: Record<string, { icon: string; color: string }> = {
      'tsx': { icon: '⚛️', color: '#3178c6' },
      'ts': { icon: '📘', color: '#3178c6' },
      'jsx': { icon: '⚛️', color: '#f7df1e' },
      'js': { icon: '📜', color: '#f7df1e' },
      'css': { icon: '🎨', color: '#264de4' },
      'json': { icon: '📋', color: '#cbcb41' },
      'md': { icon: '📝', color: '#519aba' },
      'html': { icon: '🌐', color: '#e34c26' },
      'py': { icon: '🐍', color: '#3776ab' },
      'png': { icon: '🖼️', color: '#858585' },
      'jpg': { icon: '🖼️', color: '#858585' },
      'svg': { icon: '🎨', color: '#858585' },
    }
    return iconMap[ext || ''] || { icon: '📄', color: '#858585' }
  }

  // Start with empty file tree - populated when user opens a folder
  const fileTree: { name: string; type: string; children?: any[] }[] = []

  const getFileColor = (name: string) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts')) return '#3178c6'
    if (name.endsWith('.css')) return '#264de4'
    if (name.endsWith('.json')) return '#cbcb41'
    if (name.endsWith('.md')) return '#519aba'
    return '#858585'
  }

  const handleContextMenu = (e: React.MouseEvent, item: { name: string; type: string }) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      target: { name: item.name, isFolder: item.type === 'folder' }
    })
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    // Simulate search results
    setTimeout(() => {
      setSearchResults([
        { file: 'App.tsx', line: 12, text: `const [${searchQuery}] = useState()` },
        { file: 'Header.tsx', line: 5, text: `import { ${searchQuery} } from 'react'` },
        { file: 'utils.ts', line: 23, text: `export function ${searchQuery}() {` },
      ])
      setIsSearching(false)
    }, 500)
  }

  const getContextMenuItems = (): ContextMenuItem[] => {
    if (!contextMenu.target) return []
    
    const isFolder = contextMenu.target.isFolder
    const name = contextMenu.target.name
    
    if (isFolder) {
      return [
        { label: 'New File', icon: <File size={14} />, action: () => onShowToast?.('info', `New file in ${name}`) },
        { label: 'New Folder', icon: <FolderPlus size={14} />, action: () => onShowToast?.('info', `New folder in ${name}`) },
        { divider: true as const },
        { label: 'Copy', icon: <Copy size={14} />, shortcut: 'Ctrl+C', action: () => onShowToast?.('success', `Copied ${name}`) },
        { label: 'Copy Path', action: () => { navigator.clipboard.writeText(`/${name}`); onShowToast?.('success', 'Path copied') } },
        { divider: true as const },
        { label: 'Rename', icon: <Edit3 size={14} />, shortcut: 'F2', action: () => onShowToast?.('info', `Rename ${name}`) },
        { label: 'Delete', icon: <Trash2 size={14} />, danger: true, action: () => onShowToast?.('warning', `Delete ${name}?`) },
      ]
    }

    return [
      { label: 'Open', icon: <FileCode size={14} />, action: () => { setSelectedFile(name); onShowToast?.('info', `Opened ${name}`) } },
      { label: 'Open to the Side', action: () => onShowToast?.('info', `Open ${name} in split view`) },
      { divider: true as const },
      { label: 'Copy', icon: <Copy size={14} />, shortcut: 'Ctrl+C', action: () => onShowToast?.('success', `Copied ${name}`) },
      { label: 'Copy Path', action: () => { navigator.clipboard.writeText(`/${name}`); onShowToast?.('success', 'Path copied') } },
      { divider: true as const },
      { label: 'Rename', icon: <Edit3 size={14} />, shortcut: 'F2', action: () => onShowToast?.('info', `Rename ${name}`) },
      { label: 'Delete', icon: <Trash2 size={14} />, danger: true, action: () => onShowToast?.('warning', `Delete ${name}?`) },
    ]
  }

  const renderTree = (items: any[], depth = 0, path: string[] = []) => {
    return items.map((item, idx) => {
      const isExpanded = expandedFolders.has(item.name)
      const isSelected = selectedFile === item.name
      const isFolder = item.type === 'folder'
      const hasChildren = item.children && item.children.length > 0
      const itemPath = [...path, item.name]
      const isHovered = hoveredFile === item.name
      const isDragged = draggedItem?.name === item.name
      const fileIcon = !isFolder ? getFileIcon(item.name) : null
      
      return (
        <div key={idx}>
          <div
            draggable={!isFolder}
            onDragStart={(e) => {
              setDraggedItem({ name: item.name, path: itemPath })
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (draggedItem && draggedItem.name !== item.name) {
                e.currentTarget.style.background = 'rgba(255, 0, 255, 0.1)'
              }
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.background = isSelected ? 'rgba(255, 0, 255, 0.08)' : 'transparent'
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (draggedItem && draggedItem.name !== item.name) {
                onShowToast?.('info', `Moved ${draggedItem.name} to ${item.name}`)
              }
              setDraggedItem(null)
            }}
            onClick={() => {
              if (isFolder) {
                toggleFolder(item.name)
                setBreadcrumbs([...breadcrumbs, item.name])
              } else {
                setSelectedFile(item.name)
              }
            }}
            onContextMenu={(e) => handleContextMenu(e, item)}
            onMouseEnter={() => {
              if (!isFolder) setHoveredFile(item.name)
            }}
            onMouseLeave={() => setHoveredFile(null)}
            style={{
              padding: '4px 12px',
              paddingLeft: `${16 + depth * 16}px`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isFolder ? 'pointer' : 'grab',
              background: isSelected ? 'rgba(255, 0, 255, 0.08)' : (isDragged ? 'rgba(255, 0, 255, 0.05)' : 'transparent'),
              borderLeft: isSelected ? '2px solid #FF00FF' : '2px solid transparent',
              marginLeft: '-2px',
              fontSize: '13px',
              color: isSelected ? '#fff' : '#999',
              transition: 'all 0.1s',
              fontFamily: "'Inter', -apple-system, sans-serif",
              opacity: isDragged ? 0.5 : 1,
              position: 'relative'
            }}
          >
            {isFolder ? (
              <>
                <span style={{ color: '#555', display: 'flex', alignItems: 'center' }}>
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
                <Folder size={14} style={{ color: '#E5A50A', opacity: 0.8 }} />
              </>
            ) : (
              <>
                <span style={{ width: '12px' }} />
                {item.name.endsWith('.tsx') || item.name.endsWith('.ts') ? (
                  <FileCode size={14} style={{ color: getFileColor(item.name), opacity: 0.8 }} />
                ) : (
                  <FileText size={14} style={{ color: getFileColor(item.name), opacity: 0.8 }} />
                )}
              </>
            )}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.name}
            </span>
          </div>
          
          {isFolder && isExpanded && hasChildren && (
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: `${22 + depth * 16}px`,
                top: 0,
                bottom: 0,
                width: '1px',
                background: '#1a1a1a'
              }} />
              {renderTree(item.children, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  const sidebarItems = [
    { id: 'explorer' as SidebarView, icon: Search, tooltip: 'Explorer', badge: null },
    { id: 'search' as SidebarView, icon: Search, tooltip: 'Search', badge: null },
    { id: 'codeintel' as SidebarView, icon: Brain, tooltip: 'Code Intelligence', badge: null },
    { id: 'security' as SidebarView, icon: Shield, tooltip: 'Security Dashboard', badge: null },
    { id: 'git' as SidebarView, icon: GitBranch, tooltip: 'Source Control', badge: gitChanges.length },
    { id: 'debug' as SidebarView, icon: Bug, tooltip: 'Run and Debug', badge: null },
    { id: 'extensions' as SidebarView, icon: Box, tooltip: 'Extensions', badge: null },
    { id: 'platform' as SidebarView, icon: Zap, tooltip: 'Platform Tools', badge: null },
  ]

  const renderPanel = () => {
    switch (activeView) {
      case 'search':
        return (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search files..."
                style={{
                  flex: 1,
                  background: '#141414',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  color: '#ccc',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleSearch}
                style={{
                  background: '#FF00FF',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <Search size={14} />
              </button>
            </div>
            
            {isSearching && (
              <div style={{ color: '#666', fontSize: '12px', padding: '8px' }}>
                Searching...
              </div>
            )}
            
            {searchResults.length > 0 && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  {searchResults.length} results
                </div>
                {searchResults.map((result, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedFile(result.file)
                      onShowToast?.('info', `Jumped to ${result.file}:${result.line}`)
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginBottom: '4px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,0,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize: '12px', color: '#ccc' }}>{result.file}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Line {result.line}</div>
                    <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace', marginTop: '4px' }}>
                      {result.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'codeintel':
        return (
          <CodeIntelligencePanel
            onNavigateToFile={(filePath, line, column) => {
              setSelectedFile(filePath.split('/').pop() || filePath)
              onShowToast?.('info', `Navigating to ${filePath}:${line}:${column}`)
            }}
          />
        )

      case 'security':
        return <SecurityDashboard />

      case 'git':
        return (
          <GitView 
            onShowDiff={(file) => onShowToast?.('info', `Showing diff for ${file}`)}
          />
        )

      case 'debug':
        return (
          <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px' }}>
              Run and Debug
            </div>
            
            <button
              onClick={() => onShowToast?.('info', 'Starting debugger...')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                background: '#22c55e',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
                marginBottom: '12px'
              }}
            >
              <Play size={14} />
              Start Debugging
            </button>

            <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
              Configurations
            </div>
            
            {['Launch Chrome', 'Node.js', 'Python'].map((config, idx) => (
              <div
                key={idx}
                onClick={() => onShowToast?.('info', `Selected: ${config}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#999'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Bug size={14} style={{ color: '#666' }} />
                {config}
              </div>
            ))}
          </div>
        )

      case 'extensions':
        return (
          <div style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '11px', color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>
              Extensions
            </div>
            
            <input
              type="text"
              value={extensionSearchQuery}
              onChange={(e) => setExtensionSearchQuery(e.target.value)}
              placeholder="Search extensions..."
              style={{
                width: '100%',
                background: '#141414',
                border: '1px solid #2a2a2a',
                borderRadius: '4px',
                padding: '8px 12px',
                color: '#ccc',
                fontSize: '12px',
                outline: 'none',
                marginBottom: '12px',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#FF00FF'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
            />

            <div style={{ flex: 1, overflow: 'auto' }}>
              {filteredExtensions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                  No extensions found
                </div>
              ) : (
                filteredExtensions.map((ext) => (
                  <div
                    key={ext.id}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      background: '#141414',
                      border: ext.enabled ? '1px solid rgba(255, 0, 255, 0.3)' : '1px solid transparent',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#1a1a1a'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#141414'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: ext.enabled ? 'rgba(255, 0, 255, 0.1)' : '#1a1a1a',
                        borderRadius: '6px',
                        flexShrink: 0,
                        color: ext.enabled ? '#FF00FF' : '#858585'
                      }}>
                        {getExtensionIcon(ext.icon)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <div style={{ fontSize: '12px', color: '#ccc', fontWeight: 500 }}>{ext.name}</div>
                          <span style={{ fontSize: '9px', color: '#666', padding: '1px 4px', background: '#1a1a1a', borderRadius: '2px' }}>
                            v{ext.version}
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>{ext.author}</div>
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', lineHeight: '1.4' }}>{ext.description}</div>
                        <div style={{ fontSize: '9px', color: '#555', marginTop: '4px', textTransform: 'uppercase' }}>
                          {ext.category}
                        </div>
                        
                        {/* Extension Commands */}
                        {ext.installed && ext.enabled && ext.commands && ext.commands.length > 0 && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1a1a1a' }}>
                            <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Commands:</div>
                            {ext.commands.map((cmd) => (
                              <button
                                key={cmd.id}
                                onClick={() => handleExecuteCommand(ext.id, cmd.id)}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  padding: '4px 6px',
                                  marginBottom: '4px',
                                  background: 'transparent',
                                  border: '1px solid #2a2a2a',
                                  borderRadius: '3px',
                                  color: '#858585',
                                  fontSize: '10px',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = '#FF00FF'
                                  e.currentTarget.style.color = '#FF00FF'
                                  e.currentTarget.style.background = 'rgba(255, 0, 255, 0.05)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = '#2a2a2a'
                                  e.currentTarget.style.color = '#858585'
                                  e.currentTarget.style.background = 'transparent'
                                }}
                              >
                                {cmd.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                        {ext.installed ? (
                          <>
                            <button
                              onClick={() => handleToggleExtension(ext.id, !ext.enabled)}
                              style={{
                                background: ext.enabled ? '#22c55e' : '#3e3e42',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                color: '#fff',
                                fontSize: '9px',
                                cursor: 'pointer',
                                fontWeight: 500
                              }}
                              title={ext.enabled ? 'Disable extension' : 'Enable extension'}
                            >
                              {ext.enabled ? <Check size={10} /> : <Power size={10} />}
                            </button>
                            <button
                              onClick={() => handleUninstallExtension(ext.id)}
                              style={{
                                background: 'transparent',
                                border: '1px solid #3e3e42',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                color: '#858585',
                                fontSize: '9px',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#ef4444'
                                e.currentTarget.style.color = '#ef4444'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#3e3e42'
                                e.currentTarget.style.color = '#858585'
                              }}
                              title="Uninstall extension"
                            >
                              Uninstall
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleInstallExtension(ext.id)}
                            style={{
                              background: '#FF00FF',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              color: '#fff',
                              fontSize: '10px',
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                          >
                            Install
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )

      default: // explorer
        return (
          <>
            <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Explorer
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={expandAll}
                  style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '4px' }}
                  title="Expand All"
                >
                  <ChevronsDownUp size={14} />
                </button>
                <button
                  onClick={collapseAll}
                  style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '4px' }}
                  title="Collapse All"
                >
                  <ChevronsUpDown size={14} />
                </button>
                <button
                  onClick={() => {
                    onCreateNewFile?.()
                    onShowToast?.('info', 'Creating new file...')
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '4px' }}
                  title="New File"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#FF00FF'
                    e.currentTarget.style.background = 'rgba(255, 0, 255, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#555'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={async () => {
                    try {
                      if ('showDirectoryPicker' in globalThis) {
                        const handle = await (globalThis as any).showDirectoryPicker({ mode: 'readwrite' })
                        onCreateNewFolder?.()
                        onShowToast?.('success', `Folder created: ${handle.name}`)
                      } else {
                        onCreateNewFolder?.()
                        onShowToast?.('info', 'New folder created')
                      }
                    } catch (err: any) {
                      if (err.name !== 'AbortError') {
                        onShowToast?.('error', 'Failed to create folder')
                      }
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '4px' }}
                  title="New Folder"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#FF00FF'
                    e.currentTarget.style.background = 'rgba(255, 0, 255, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#555'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <FolderPlus size={14} />
                </button>
              </div>
            </div>

            {/* Breadcrumb Navigation */}
            <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              {breadcrumbs.map((crumb, idx) => (
                <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    onClick={() => {
                      setBreadcrumbs(breadcrumbs.slice(0, idx + 1))
                      onShowToast?.('info', `Navigated to ${crumb}`)
                    }}
                    style={{
                      color: idx === breadcrumbs.length - 1 ? '#FF00FF' : '#666',
                      cursor: 'pointer',
                      transition: 'color 0.1s'
                    }}
                    onMouseEnter={(e) => {
                      if (idx !== breadcrumbs.length - 1) e.currentTarget.style.color = '#FF00FF'
                    }}
                    onMouseLeave={(e) => {
                      if (idx !== breadcrumbs.length - 1) e.currentTarget.style.color = '#666'
                    }}
                  >
                    {crumb}
                  </span>
                  {idx < breadcrumbs.length - 1 && (
                    <ChevronRight size={10} style={{ color: '#444' }} />
                  )}
                </span>
              ))}
            </div>

            <div style={{ height: '1px', background: 'linear-gradient(90deg, #1a1a1a 0%, #0a0a0a 100%)', margin: '0 16px' }} />

            <div style={{ flex: 1, overflow: 'auto', padding: '12px 0' }}>
              {fileTree.length > 0 ? (
                renderTree(fileTree, 0, breadcrumbs)
              ) : (
                <div style={{ 
                  padding: '24px 16px', 
                  textAlign: 'center',
                  color: '#444',
                  fontSize: '12px'
                }}>
                  <div style={{ marginBottom: '8px' }}>No folder opened</div>
                  <div style={{ fontSize: '11px', color: '#333' }}>
                    Use <span style={{ color: '#FF00FF' }}>File → Open Folder</span>
                  </div>
                </div>
              )}
            </div>

            {fileTree.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #151515', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: '11px', color: '#444' }}>{fileTree.length} items</span>
              </div>
            )}
          </>
        )
      
      case 'platform': {
        const platformItems = [
          { id: 'automation', label: 'Automation', icon: Play, desc: 'Testing, debugging, CI/CD' },
          { id: 'plugins', label: 'Plugins', icon: Box, desc: 'Manage extensions & plugins' },
          { id: 'workflows', label: 'Workflows', icon: RefreshCw, desc: 'Automation templates' },
          { id: 'teams', label: 'Teams', icon: Shield, desc: 'Organization & members' },
          { id: 'shared-agents', label: 'Shared Agents', icon: Brain, desc: 'AI agents & tools' },
        ]
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid #1a1a1a',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Zap size={16} style={{ color: '#FF00FF' }} />
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>Platform Tools</span>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
              <div style={{ 
                fontSize: '11px', 
                color: '#666', 
                marginBottom: '16px',
                padding: '0 4px'
              }}>
                Advanced automation and platform features
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {platformItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onSwitchRightPanel?.(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: '#141414',
                      border: '1px solid #1a1a1a',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#FF00FF'
                      e.currentTarget.style.background = '#1a1a1a'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#1a1a1a'
                      e.currentTarget.style.background = '#141414'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255,0,255,0.1)',
                      borderRadius: '8px'
                    }}>
                      <item.icon size={16} style={{ color: '#FF00FF' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', color: '#fff', fontWeight: 500, marginBottom: '2px' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {item.desc}
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: '#444' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0a0a0a' }}>
      {/* Icon Rail */}
      <div style={{
        width: '48px',
        background: '#080808',
        borderRight: '1px solid #151515',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: '2px'
      }}>
        {sidebarItems.map((item, i) => {
          // Use Logo for first item
          const isActive = activeView === item.id
          
          return (
            <button
              key={item.id}
              title={item.tooltip}
              onClick={() => setActiveView(item.id)}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive ? 'rgba(255, 0, 255, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              {i === 0 ? (
                <Logo size={18} variant="icon" />
              ) : (
                <item.icon size={18} style={{ 
                  color: isActive ? '#FF00FF' : '#555',
                  strokeWidth: 1.5
                }} />
              )}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '2px',
                  height: '20px',
                  background: '#FF00FF',
                  borderRadius: '0 2px 2px 0'
                }} />
              )}
              {item.badge && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '14px',
                  height: '14px',
                  background: '#FF00FF',
                  borderRadius: '50%',
                  fontSize: '9px',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600
                }}>
                  {item.badge}
                </div>
              )}
            </button>
          )
        })}
        
        <div style={{ flex: 1 }} />
        
        <button
          title="Settings"
          onClick={() => onShowToast?.('info', 'Settings opened')}
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Settings size={18} style={{ color: '#444', strokeWidth: 1.5 }} />
        </button>
      </div>

      {/* Panel Content */}
      <div style={{
        width: `${width}px`,
        minWidth: '200px',
        maxWidth: '400px',
        background: '#0a0a0a',
        borderRight: '1px solid #151515',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0
      }}>
        {renderPanel()}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        />
      )}
    </div>
  )
}
