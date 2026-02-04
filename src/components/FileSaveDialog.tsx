import { useState, useEffect, useRef } from 'react'
import { X, File, Folder, Save, Sparkles } from 'lucide-react'

interface FileSaveDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, path: string[], content: string) => Promise<void>
  suggestedName?: string
  initialContent?: string
  currentFolder?: FileSystemDirectoryHandle | null
}

export default function FileSaveDialog({
  isOpen,
  onClose,
  onSave,
  suggestedName = 'untitled',
  initialContent = '',
  currentFolder = null
}: FileSaveDialogProps) {
  const [fileName, setFileName] = useState(suggestedName)
  const [selectedPath, setSelectedPath] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showFolderPicker, setShowFolderPicker] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFileName(suggestedName)
      setSelectedPath([])
      setError(null)
      // Focus input after dialog opens
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, suggestedName])

  // Smart filename suggestions based on content (no forced extensions)
  const getSmartSuggestions = (content: string): string[] => {
    const suggestions: string[] = []
    
    // Check for React component
    if (content.includes('export default function') || content.includes('export const') || content.includes('function Component')) {
      const match = content.match(/(?:export\s+(?:default\s+)?(?:function|const)\s+)(\w+)/)
      if (match) {
        const componentName = match[1]
        suggestions.push(componentName) // No extension - user decides
        suggestions.push(`${componentName}.tsx`)
        suggestions.push(`${componentName}.ts`)
      }
    }
    
    // Check for class
    if (content.includes('class ')) {
      const match = content.match(/class\s+(\w+)/)
      if (match) {
        suggestions.push(match[1]) // No extension - user decides
        suggestions.push(`${match[1]}.ts`)
      }
    }
    
    // Check for interface/type
    if (content.includes('interface ') || content.includes('type ')) {
      const match = content.match(/(?:interface|type)\s+(\w+)/)
      if (match) {
        suggestions.push(match[1]) // No extension - user decides
        suggestions.push(`${match[1]}.ts`)
      }
    }
    
    // Check for hook pattern
    if (content.includes('use') && content.includes('const') && content.includes('useState')) {
      const match = content.match(/const\s+(\w+)\s*=/)
      if (match && match[1].startsWith('use')) {
        suggestions.push(match[1]) // No extension - user decides
        suggestions.push(`${match[1]}.ts`)
      }
    }
    
    // Default suggestions (no extensions forced)
    if (suggestions.length === 0) {
      suggestions.push('main')
      suggestions.push('index')
      suggestions.push('app')
      suggestions.push('project')
    }
    
    return suggestions
  }

  const smartSuggestions = getSmartSuggestions(initialContent)

  const handleSave = async () => {
    if (!fileName.trim()) {
      setError('File name cannot be empty')
      return
    }

    // Use filename exactly as user typed it - no forced extensions
    const finalFileName = fileName.trim()

    setIsSaving(true)
    setError(null)

    try {
      await onSave(finalFileName, selectedPath, initialContent)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save file')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectFolder = async () => {
    try {
      if ('showDirectoryPicker' in globalThis) {
        const handle = await (globalThis as any).showDirectoryPicker({
          mode: 'readwrite'
        })
        
        // Get path from handle
        const path: string[] = []
        let current: FileSystemDirectoryHandle | null = handle
        // Note: File System Access API doesn't provide full path, so we use the folder name
        path.push(handle.name)
        setSelectedPath(path)
        setShowFolderPicker(false)
      } else {
        setError('Directory picker not supported in this browser')
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Failed to select folder')
      }
      setShowFolderPicker(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '600px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Save size={20} style={{ color: '#FF00FF' }} />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#e0e0e0' }}>
              Create New Project File
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FF00FF'
              e.currentTarget.style.background = 'rgba(255, 0, 255, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#666'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>
          {/* File Name Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                color: '#888',
                marginBottom: '8px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              File Name (Any name you want)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={fileName}
              onChange={(e) => {
                setFileName(e.target.value)
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter file name..."
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0f0f0f',
                border: `2px solid ${error ? '#ef4444' : '#2a2a2a'}`,
                borderRadius: '6px',
                color: '#e0e0e0',
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#FF00FF'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 0, 255, 0.1)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = error ? '#ef4444' : '#2a2a2a'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            {error && (
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444' }}>
                {error}
              </div>
            )}
          </div>

          {/* Smart Suggestions - Optional, user can ignore */}
          {smartSuggestions.length > 0 && fileName === suggestedName && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}
              >
                <Sparkles size={14} style={{ color: '#FF00FF' }} />
                <label
                  style={{
                    fontSize: '12px',
                    color: '#888',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Optional Suggestions
                </label>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {smartSuggestions.slice(0, 4).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setFileName(suggestion)
                      setError(null)
                    }}
                    style={{
                      padding: '6px 12px',
                      background: fileName === suggestion ? 'rgba(255, 0, 255, 0.2)' : '#0f0f0f',
                      border: `1px solid ${fileName === suggestion ? '#FF00FF' : '#2a2a2a'}`,
                      borderRadius: '6px',
                      color: fileName === suggestion ? '#FF00FF' : '#ccc',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (fileName !== suggestion) {
                        e.currentTarget.style.borderColor = '#FF00FF'
                        e.currentTarget.style.background = 'rgba(255, 0, 255, 0.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (fileName !== suggestion) {
                        e.currentTarget.style.borderColor = '#2a2a2a'
                        e.currentTarget.style.background = '#0f0f0f'
                      }
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#666' }}>
                You can type any filename you want - no restrictions
              </div>
            </div>
          )}

          {/* Folder Selection */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                color: '#888',
                marginBottom: '8px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Save Location
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: '#0f0f0f',
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  color: selectedPath.length > 0 ? '#e0e0e0' : '#666',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Folder size={16} style={{ color: '#666' }} />
                {selectedPath.length > 0 ? selectedPath.join('/') : 'Select folder...'}
              </div>
              <button
                onClick={handleSelectFolder}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(255, 0, 255, 0.1)',
                  border: '1px solid #FF00FF',
                  borderRadius: '6px',
                  color: '#FF00FF',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 0, 255, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 0, 255, 0.1)'
                }}
              >
                <Folder size={14} />
                Browse
              </button>
            </div>
            {selectedPath.length === 0 && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#666' }}>
                This file will become the base of a new project. Choose where to save it.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #2a2a2a',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}
        >
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #2a2a2a',
              borderRadius: '6px',
              color: '#ccc',
              fontSize: '13px',
              fontWeight: 500,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isSaving ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.borderColor = '#666'
                e.currentTarget.style.color = '#e0e0e0'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving) {
                e.currentTarget.style.borderColor = '#2a2a2a'
                e.currentTarget.style.color = '#ccc'
              }
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !fileName.trim()}
            style={{
              padding: '8px 20px',
              background: isSaving || !fileName.trim() ? '#2a2a2a' : '#FF00FF',
              border: 'none',
              borderRadius: '6px',
              color: isSaving || !fileName.trim() ? '#666' : '#000',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isSaving || !fileName.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              if (!isSaving && fileName.trim()) {
                e.currentTarget.style.background = '#ff33ff'
                e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 0, 255, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving && fileName.trim()) {
                e.currentTarget.style.background = '#FF00FF'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
          >
            {isSaving ? (
              <>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid #666',
                    borderTopColor: '#000',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }}
                />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save File
              </>
            )}
          </button>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
