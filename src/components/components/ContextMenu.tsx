import { useEffect, useRef } from 'react'
import { 
  File, FolderPlus, Trash2, Copy, Clipboard, 
  Edit3, FileCode, Search, Terminal 
} from 'lucide-react'

// Divider item type
interface ContextMenuDivider {
  divider: true
  label?: never
}

// Regular menu item type
interface ContextMenuAction {
  label: string
  icon?: React.ReactNode
  shortcut?: string
  divider?: false
  disabled?: boolean
  danger?: boolean
  action?: () => void
}

// Union type for all menu items
export type ContextMenuItem = ContextMenuDivider | ContextMenuAction

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

// Type guard for divider items
function isDivider(item: ContextMenuItem): item is ContextMenuDivider {
  return 'divider' in item && item.divider === true
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`
      }
    }
  }, [x, y])

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '6px',
        padding: '4px 0',
        minWidth: '200px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        zIndex: 10000,
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {items.map((item, idx) => {
        if (isDivider(item)) {
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
            onClick={() => {
              if (!item.disabled && item.action) {
                item.action()
                onClose()
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              cursor: item.disabled ? 'default' : 'pointer',
              color: item.disabled ? '#555' : (item.danger ? '#ef4444' : '#ccc'),
              fontSize: '12px',
              transition: 'background 0.1s'
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.background = item.danger 
                  ? 'rgba(239, 68, 68, 0.15)' 
                  : 'rgba(255, 0, 255, 0.1)'
                e.currentTarget.style.color = item.danger ? '#ef4444' : '#FF00FF'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = item.disabled ? '#555' : (item.danger ? '#ef4444' : '#ccc')
            }}
          >
            {item.icon && (
              <span style={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                {item.icon}
              </span>
            )}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && (
              <span style={{
                fontSize: '11px',
                color: '#666',
                fontFamily: "'Inter', monospace"
              }}>
                {item.shortcut}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Preset context menu items for file explorer
export const getFileContextMenuItems = (
  _fileName: string,
  isFolder: boolean,
  callbacks: {
    onNewFile?: (() => void) | undefined
    onNewFolder?: (() => void) | undefined
    onRename?: (() => void) | undefined
    onDelete?: (() => void) | undefined
    onCopy?: (() => void) | undefined
    onPaste?: (() => void) | undefined
    onCopyPath?: (() => void) | undefined
    onOpenInTerminal?: (() => void) | undefined
    onFindInFolder?: (() => void) | undefined
  }
): ContextMenuItem[] => {
  if (isFolder) {
    return [
      { label: 'New File', icon: <File size={14} />, ...(callbacks.onNewFile && { action: callbacks.onNewFile }) },
      { label: 'New Folder', icon: <FolderPlus size={14} />, ...(callbacks.onNewFolder && { action: callbacks.onNewFolder }) },
      { divider: true as const },
      { label: 'Find in Folder...', icon: <Search size={14} />, ...(callbacks.onFindInFolder && { action: callbacks.onFindInFolder }) },
      { label: 'Open in Terminal', icon: <Terminal size={14} />, ...(callbacks.onOpenInTerminal && { action: callbacks.onOpenInTerminal }) },
      { divider: true as const },
      { label: 'Copy', icon: <Copy size={14} />, shortcut: 'Ctrl+C', ...(callbacks.onCopy && { action: callbacks.onCopy }) },
      { label: 'Paste', icon: <Clipboard size={14} />, shortcut: 'Ctrl+V', ...(callbacks.onPaste && { action: callbacks.onPaste }) },
      { label: 'Copy Path', ...(callbacks.onCopyPath && { action: callbacks.onCopyPath }) },
      { divider: true as const },
      { label: 'Rename', icon: <Edit3 size={14} />, shortcut: 'F2', ...(callbacks.onRename && { action: callbacks.onRename }) },
      { label: 'Delete', icon: <Trash2 size={14} />, danger: true, ...(callbacks.onDelete && { action: callbacks.onDelete }) },
    ]
  }

  return [
    { label: 'Open', icon: <FileCode size={14} />, ...(callbacks.onNewFile && { action: callbacks.onNewFile }) },
    { label: 'Open to the Side', ...(callbacks.onNewFile && { action: callbacks.onNewFile }) },
    { divider: true as const },
    { label: 'Copy', icon: <Copy size={14} />, shortcut: 'Ctrl+C', ...(callbacks.onCopy && { action: callbacks.onCopy }) },
    { label: 'Copy Path', ...(callbacks.onCopyPath && { action: callbacks.onCopyPath }) },
    { label: 'Copy Relative Path', ...(callbacks.onCopyPath && { action: callbacks.onCopyPath }) },
    { divider: true as const },
    { label: 'Rename', icon: <Edit3 size={14} />, shortcut: 'F2', ...(callbacks.onRename && { action: callbacks.onRename }) },
    { label: 'Delete', icon: <Trash2 size={14} />, danger: true, ...(callbacks.onDelete && { action: callbacks.onDelete }) },
  ]
}
