import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { X, ChevronRight, MoreHorizontal, ChevronDown, GitBranch } from 'lucide-react'
import { ToastMessage } from './Toast'
import FileSaveDialog from './FileSaveDialog'

interface EditorAreaProps {
  onShowToast?: (type: ToastMessage['type'], message: string) => void
}

interface Tab {
  id: string
  name: string
  path: string[]
  content: string
  modified?: boolean
  fileHandle?: FileSystemFileHandle // For saving back to disk
}

// Ref interface for external control
export interface EditorAreaRef {
  createNewFile: () => void
  openFile: () => void
  saveFile: () => void
  getCurrentFile: () => Tab | undefined
  addFile: (name: string, content: string, language: string) => void
  addFileDirect: (name: string, content: string, language: string) => void
  setProjectFolder: (handle: FileSystemDirectoryHandle) => void
  getProjectFolder: () => FileSystemDirectoryHandle | null
}

function EditorAreaComponent({ onShowToast }: EditorAreaProps, ref: React.ForwardedRef<EditorAreaRef>) {
  // Start with empty tabs - user creates/opens their own files
  const [tabs, setTabs] = useState<Tab[]>([])
  
  const [activeTab, setActiveTab] = useState('')
  const [draggedTab, setDraggedTab] = useState<string | null>(null)
  const [dragOverTab, setDragOverTab] = useState<string | null>(null)
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set())
  const [foldedLines, setFoldedLines] = useState<Set<number>>(new Set())
  const [showMinimap, setShowMinimap] = useState(true)
  const [multiCursors, setMultiCursors] = useState<number[]>([])
  const [fileCounter, setFileCounter] = useState(1)
  const tabsRef = useRef<HTMLDivElement>(null)
  const editorContentRef = useRef<HTMLDivElement>(null)
  
  // Project folder for auto-saving
  const [projectFolderHandle, setProjectFolderHandle] = useState<FileSystemDirectoryHandle | null>(null)

  // File save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [pendingFileContent, setPendingFileContent] = useState('')

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    createNewFile: () => {
      // Open file save dialog - this creates a new project
      const defaultContent = `// New Project File\n// This is your project base file\n// Start coding here...\n\n`
      setPendingFileContent(defaultContent)
      setShowSaveDialog(true)
    },
    openFile: async () => {
      try {
        // Check if File System Access API is supported
        if ('showOpenFilePicker' in globalThis) {
          const [handle] = await (globalThis as any).showOpenFilePicker({
            multiple: false,
            excludeAcceptAllOption: false, // Allow "All Files" option
            types: [
              { description: 'Code Files', accept: { 
                'text/plain': ['.ts', '.tsx', '.js', '.jsx', '.py', '.html', '.css', '.json', '.md', '.txt', '.rs', '.go', '.java', '.c', '.cpp', '.h']
              }},
            ],
          })
          
          const file = await handle.getFile()
          const content = await file.text()
          const newId = fileCounter.toString()
          
          const newTab: Tab = {
            id: newId,
            name: file.name,
            path: [],
            content,
            modified: false,
            fileHandle: handle
          }
          setTabs(prev => [...prev, newTab])
          setActiveTab(newId)
          setFileCounter(prev => prev + 1)
          onShowToast?.('success', `Opened ${file.name}`)
        } else {
          // Fallback: use traditional file input
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.ts,.tsx,.js,.jsx,.py,.html,.css,.json,.md,.txt'
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) {
              const content = await file.text()
              const newId = fileCounter.toString()
              const newTab: Tab = {
                id: newId,
                name: file.name,
                path: [],
                content,
                modified: false
              }
              setTabs(prev => [...prev, newTab])
              setActiveTab(newId)
              setFileCounter(prev => prev + 1)
              onShowToast?.('success', `Opened ${file.name}`)
            }
          }
          input.click()
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          onShowToast?.('error', 'Failed to open file')
        }
      }
    },
    saveFile: async () => {
      const currentTab = tabs.find(t => t.id === activeTab)
      if (!currentTab) return
      
      try {
        if (currentTab.fileHandle) {
          // Save to existing file handle
          const writable = await currentTab.fileHandle.createWritable()
          await writable.write(currentTab.content)
          await writable.close()
          setTabs(prev => prev.map(t => 
            t.id === activeTab ? { ...t, modified: false } : t
          ))
          onShowToast?.('success', `Saved ${currentTab.name}`)
        } else if ('showSaveFilePicker' in globalThis) {
          // No handle yet, prompt for save location
          const handle = await (globalThis as any).showSaveFilePicker({
            suggestedName: currentTab.name,
          })
          
          const writable = await handle.createWritable()
          await writable.write(currentTab.content)
          await writable.close()
          
          setTabs(prev => prev.map(t => 
            t.id === activeTab ? { ...t, modified: false, fileHandle: handle, name: handle.name } : t
          ))
          onShowToast?.('success', `Saved ${handle.name}`)
        } else {
          // Fallback: download file
          const blob = new Blob([currentTab.content], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = currentTab.name
          a.click()
          URL.revokeObjectURL(url)
          setTabs(prev => prev.map(t => 
            t.id === activeTab ? { ...t, modified: false } : t
          ))
          onShowToast?.('success', `Downloaded ${currentTab.name}`)
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          onShowToast?.('error', 'Failed to save file')
        }
      }
    },
    getCurrentFile: () => tabs.find(t => t.id === activeTab),
    addFileDirect: async (name: string, content: string, _language: string) => {
      // Direct file addition without dialog (for programmatic creation)
      // Check if file already exists — update it instead of duplicating
      const existingTab = tabs.find(t => t.name === name)
      if (existingTab) {
        setTabs(prev => prev.map(t => 
          t.name === name ? { ...t, content, modified: true } : t
        ))
        setActiveTab(existingTab.id)
        onShowToast?.('info', `Updated ${name}`)
        return
      }
      
      const newId = fileCounter.toString()
      const newTab: Tab = {
        id: newId,
        name: name,
        path: name.includes('/') ? name.split('/').slice(0, -1) : [],
        content: content,
        modified: true
      }
      setTabs(prev => [...prev, newTab])
      setActiveTab(newId)
      setFileCounter(prev => prev + 1)
      onShowToast?.('success', `Created ${name}`)
    },
    
    addFile: async (name: string, content: string, _language: string) => {
      // Check if file already exists
      const existingTab = tabs.find(t => t.name === name)
      if (existingTab) {
        // Update existing file
        setTabs(prev => prev.map(t => 
          t.name === name ? { ...t, content, modified: true } : t
        ))
        setActiveTab(existingTab.id)
        
        // Auto-save if project folder is set
        if (projectFolderHandle && existingTab.fileHandle) {
          try {
            const writable = await existingTab.fileHandle.createWritable()
            await writable.write(content)
            await writable.close()
            setTabs(prev => prev.map(t => 
              t.name === name ? { ...t, modified: false } : t
            ))
          } catch {
            // Silently fail auto-save
          }
        }
        return
      }
      
      // Create new file - use save dialog flow
      setPendingFileContent(content)
      setShowSaveDialog(true)
    },
    setProjectFolder: (handle: FileSystemDirectoryHandle) => {
      setProjectFolderHandle(handle)
      onShowToast?.('success', `Project folder set: ${handle.name}`)
    },
    getProjectFolder: () => projectFolderHandle
  }))

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const tab = tabs.find(t => t.id === tabId)
    const newTabs = tabs.filter(t => t.id !== tabId)
    
    if (newTabs.length > 0) {
      setTabs(newTabs)
      const firstTab = newTabs[0]
      if (activeTab === tabId && firstTab) {
        setActiveTab(firstTab.id)
      }
      onShowToast?.('info', `Closed ${tab?.name || 'tab'}`)
    }
  }

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault()
    if (draggedTab && draggedTab !== tabId) {
      setDragOverTab(tabId)
    }
  }

  const handleDragLeave = () => {
    setDragOverTab(null)
  }

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault()
    if (draggedTab && draggedTab !== targetTabId) {
      const newTabs = [...tabs]
      const draggedIndex = newTabs.findIndex(t => t.id === draggedTab)
      const targetIndex = newTabs.findIndex(t => t.id === targetTabId)
      
      if (draggedIndex >= 0 && targetIndex >= 0) {
        const removedArray = newTabs.splice(draggedIndex, 1)
        const removed = removedArray[0]
        if (removed !== undefined) {
          newTabs.splice(targetIndex, 0, removed)
          setTabs(newTabs)
          onShowToast?.('info', 'Tab reordered')
        }
      }
    }
    setDraggedTab(null)
    setDragOverTab(null)
  }

  const handleDragEnd = () => {
    setDraggedTab(null)
    setDragOverTab(null)
  }

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0]

  const highlightSyntax = (line: string): string => {
    // Tokenize the line to avoid regex overlap issues
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Check for full-line comment first (// or #) — highlight the entire line
    const commentMatch = escaped.match(/^(\s*)(\/\/.*|#.*)$/)
    if (commentMatch) {
      return `${commentMatch[1]}<span style="color:#6a9955;font-style:italic">${commentMatch[2]}</span>`
    }

    // Split into string tokens and non-string tokens to avoid highlighting inside strings
    const parts: string[] = []
    let remaining = escaped
    const stringRegex = /(['"`])(.*?)(\1)/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = stringRegex.exec(escaped)) !== null) {
      // Add non-string part before this match
      if (match.index > lastIndex) {
        parts.push(highlightCode(escaped.slice(lastIndex, match.index)))
      }
      // Add the string literal with string color
      parts.push(`<span style="color:#ce9178">${match[0]}</span>`)
      lastIndex = match.index + match[0].length
    }
    // Add remaining non-string part
    if (lastIndex < escaped.length) {
      parts.push(highlightCode(escaped.slice(lastIndex)))
    }

    return parts.join('')
  }

  // Highlight keywords, functions, and numbers in non-string code
  const highlightCode = (code: string): string => {
    return code
      .replace(
        /\b(import|export|from|const|let|var|function|return|if|else|for|while|class|interface|type|new|this|async|await|def|elif|self|None|True|False|extends|implements|static|public|private|protected|readonly|enum|typeof|instanceof)\b/g,
        '<span style="color:#c586c0">$1</span>'
      )
      .replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, '<span style="color:#dcdcaa">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span style="color:#b5cea8">$1</span>')
      .replace(/(\/\/[^\n]*)$/g, '<span style="color:#6a9955;font-style:italic">$1</span>')
  }

  const getFileIcon = (name: string) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts')) return '⚛️'
    if (name.endsWith('.py')) return '🐍'
    if (name.endsWith('.js') || name.endsWith('.jsx')) return '📜'
    if (name.endsWith('.css')) return '🎨'
    if (name.endsWith('.json')) return '📋'
    if (name.endsWith('.md')) return '📝'
    return '📄'
  }

  // Multi-cursor support (Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        const lines = currentTab?.content.split('\n') || []
        if (lines.length > 0) {
          const randomLine = Math.floor(Math.random() * lines.length)
          setMultiCursors(prev => [...prev, randomLine])
          onShowToast?.('info', `Added cursor at line ${randomLine + 1}`)
        }
      }
      if (e.key === 'Escape') {
        setMultiCursors([])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentTab, onShowToast])

  const toggleFold = (lineNumber: number) => {
    const newFolded = new Set(foldedLines)
    if (newFolded.has(lineNumber)) {
      newFolded.delete(lineNumber)
    } else {
      newFolded.add(lineNumber)
    }
    setFoldedLines(newFolded)
  }

  const isFoldable = (line: string): boolean => {
    return line.trim().endsWith('{') || line.trim().startsWith('function') || line.trim().startsWith('class')
  }

  const getGitDiffIndicator = (lineNumber: number): 'added' | 'removed' | 'modified' | null => {
    // Simulate git diff indicators
    if (lineNumber === 3 || lineNumber === 6) return 'added'
    if (lineNumber === 4) return 'removed'
    if (lineNumber === 5) return 'modified'
    return null
  }

  // Bracket highlighting is handled via CSS — no need to modify HTML after syntax highlight
  const highlightBrackets = (html: string): string => html

  const handleSaveFile = async (fileName: string, path: string[], content: string) => {
    try {
      // Use File System Access API to save file
      if ('showSaveFilePicker' in globalThis) {
        // For new projects, let user choose where to save (creates project root)
        const handle = await (globalThis as any).showSaveFilePicker({
          suggestedName: fileName,
        })
        
        const writable = await handle.createWritable()
        await writable.write(content)
        await writable.close()
        
        // Get the directory containing the file (this becomes the project root)
        const fileDirectory = await handle.getParent()
        
        // Set this directory as the project folder (new project base)
        setProjectFolderHandle(fileDirectory)
        onShowToast?.('success', `Created new project: ${fileDirectory.name}`)
        
        // Add file to editor tabs
        const newId = fileCounter.toString()
        const newTab: Tab = {
          id: newId,
          name: handle.name,
          path: [],
          content,
          modified: false,
          fileHandle: handle
        }
        setTabs(prev => [...prev, newTab])
        setActiveTab(newId)
        setFileCounter(prev => prev + 1)
        onShowToast?.('success', `Saved ${handle.name} - Project folder set`)
      } else {
        throw new Error('File System Access API not supported')
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        throw err
      }
    }
  }

  const getSuggestedFileName = (content: string): string => {
    // Smart filename detection - but user can override with anything
    if (content.includes('export default function') || content.includes('export const')) {
      const match = content.match(/(?:export\s+(?:default\s+)?(?:function|const)\s+)(\w+)/)
      if (match) {
        return `${match[1]}` // No forced extension
      }
    }
    if (content.includes('class ')) {
      const match = content.match(/class\s+(\w+)/)
      if (match) {
        return `${match[1]}` // No forced extension
      }
    }
    return `untitled-${fileCounter}` // No forced extension - user decides
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#0f0f0f',
      overflow: 'hidden'
    }}>
      {/* File Save Dialog */}
      <FileSaveDialog
        isOpen={showSaveDialog}
        onClose={() => {
          setShowSaveDialog(false)
          setPendingFileContent('')
        }}
        onSave={handleSaveFile}
        suggestedName={getSuggestedFileName(pendingFileContent)}
        initialContent={pendingFileContent}
        currentFolder={projectFolderHandle}
      />
      
      {/* Tabs */}
      <div 
        ref={tabsRef}
        style={{
          display: 'flex',
          background: '#141414',
          borderBottom: '1px solid #1a1a1a',
          overflowX: 'auto',
          height: '42px',
          paddingLeft: '8px',
          gap: '2px'
        }}
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTab
          const isDragOver = tab.id === dragOverTab
          
          return (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, tab.id)}
              onDragEnd={handleDragEnd}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 16px',
                backgroundColor: isActive ? '#0f0f0f' : (isDragOver ? '#1a1a1a' : 'transparent'),
                borderBottom: isActive ? '2px solid #FF00FF' : '2px solid transparent',
                borderLeft: isDragOver ? '2px solid #FF00FF' : '2px solid transparent',
                cursor: 'grab',
                fontSize: '13px',
                color: isActive ? '#cccccc' : '#858585',
                minWidth: '120px',
                position: 'relative',
                height: '42px',
                boxSizing: 'border-box',
                transition: 'background 0.1s',
                opacity: draggedTab === tab.id ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isActive && draggedTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = '#1a1a1a'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive && draggedTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <span style={{ fontSize: '12px' }}>{getFileIcon(tab.name)}</span>
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px' 
              }}>
                {tab.name}
                {tab.modified && (
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: '#FF00FF',
                    marginLeft: '4px'
                  }} />
                )}
              </span>
              <button
                onClick={(e) => closeTab(tab.id, e)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#858585',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                  marginLeft: 'auto',
                  opacity: 0.6,
                  transition: 'all 0.1s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#cccccc'
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#858585'
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.opacity = '0.6'
                }}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
        
        {/* More tabs indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          color: '#555',
          cursor: 'pointer'
        }}>
          <MoreHorizontal size={16} />
        </div>
      </div>

      {/* Breadcrumbs */}
      {currentTab && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 16px',
          background: '#0a0a0a',
          borderBottom: '1px solid #1a1a1a',
          fontSize: '12px',
          color: '#666'
        }}>
          {currentTab.path.map((segment, idx) => (
            <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span 
                style={{ 
                  cursor: 'pointer',
                  transition: 'color 0.1s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FF00FF'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
              >
                {segment}
              </span>
              <ChevronRight size={12} style={{ color: '#444' }} />
            </span>
          ))}
          <span style={{ color: '#ccc' }}>{currentTab.name}</span>
        </div>
      )}

      {/* Editor with line numbers */}
      {currentTab ? (
        (() => {
          const tab = currentTab
          return (
            <div style={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
              fontSize: '14px',
              lineHeight: '1.7',
              color: '#cccccc',
              background: '#0f0f0f',
              position: 'relative'
            }}>
              {/* Git Diff Indicators */}
              <div style={{
                width: '4px',
                background: '#0a0a0a',
                position: 'relative'
              }}>
                {tab.content.split('\n').map((_, idx) => {
                  const diffType = getGitDiffIndicator(idx + 1)
                  if (!diffType) return null
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        top: `${idx * 1.7}em`,
                        left: 0,
                        width: '4px',
                        height: '1.7em',
                        background: diffType === 'added' ? '#22c55e' : diffType === 'removed' ? '#ef4444' : '#FFA500'
                      }}
                    />
                  )
                })}
              </div>

              {/* Line Numbers */}
              <div style={{
                padding: '24px 16px 24px 24px',
                textAlign: 'right',
                color: '#444',
                userSelect: 'none',
                borderRight: '1px solid #1a1a1a',
                background: '#0a0a0a',
                minWidth: '60px'
              }}>
                {tab.content.split('\n').map((_, idx) => {
                  const isSelected = selectedLines.has(idx + 1)
                  const hasMultiCursor = multiCursors.includes(idx)
                  return (
                    <div 
                      key={idx}
                      style={{ 
                        height: '1.7em',
                        cursor: 'pointer',
                        transition: 'color 0.1s',
                        color: isSelected || hasMultiCursor ? '#FF00FF' : '#444',
                        fontWeight: isSelected ? 600 : 400
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !hasMultiCursor) e.currentTarget.style.color = '#FF00FF'
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !hasMultiCursor) e.currentTarget.style.color = '#444'
                      }}
                      onClick={() => {
                        const newSelected = new Set(selectedLines)
                        if (newSelected.has(idx + 1)) {
                          newSelected.delete(idx + 1)
                        } else {
                          newSelected.add(idx + 1)
                        }
                        setSelectedLines(newSelected)
                        onShowToast?.('info', `Selected line ${idx + 1}`)
                      }}
                    >
                      {idx + 1}
                    </div>
                  )
                })}
              </div>

              {/* Code Content */}
              <div 
                ref={editorContentRef}
                style={{
                  flex: 1,
                  padding: '24px 32px',
                  overflow: 'auto',
                  position: 'relative'
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#cccccc' }}>
                  <code>
                    {tab.content.split('\n').map((line, idx) => {
                      const isFolded = foldedLines.has(idx + 1)
                      const isSelected = selectedLines.has(idx + 1)
                      const hasMultiCursor = multiCursors.includes(idx)
                      const canFold = isFoldable(line)
                      
                      if (isFolded && canFold) {
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              height: '1.7em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: isSelected ? 'rgba(255, 0, 255, 0.1)' : 'transparent'
                            }}
                          >
                            <button
                              onClick={() => toggleFold(idx + 1)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <ChevronRight size={12} />
                            </button>
                            <span style={{ color: '#666', fontStyle: 'italic' }}>...</span>
                          </div>
                        )
                      }
                      
                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            height: '1.7em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: isSelected ? 'rgba(255, 0, 255, 0.1)' : 'transparent',
                            position: 'relative'
                          }}
                        >
                          {canFold && (
                            <button
                              onClick={() => toggleFold(idx + 1)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                marginLeft: '-20px'
                              }}
                            >
                              <ChevronDown size={12} />
                            </button>
                          )}
                          {hasMultiCursor && (
                            <div style={{
                              position: 'absolute',
                              left: '-4px',
                              width: '2px',
                              height: '1.7em',
                              background: '#FF00FF',
                              zIndex: 10
                            }} />
                          )}
                          <span 
                            dangerouslySetInnerHTML={{ 
                              __html: highlightBrackets(highlightSyntax(line) || '&nbsp;') 
                            }} 
                          />
                        </div>
                      )
                    })}
                  </code>
                </pre>
              </div>

              {/* Minimap */}
              {showMinimap && tab.content.split('\n').length > 20 && (
                <div style={{
                  width: '80px',
                  background: '#0a0a0a',
                  borderLeft: '1px solid #1a1a1a',
                  padding: '8px 4px',
                  fontSize: '2px',
                  lineHeight: '1',
                  opacity: 0.6,
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {tab.content.split('\n').map((line, idx) => (
                    <div
                      key={idx}
                      style={{
                        height: '2px',
                        marginBottom: '1px',
                        background: line.trim() ? '#333' : 'transparent',
                        fontSize: '1px'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })()
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#444',
          fontSize: '13px',
          gap: '8px'
        }}>
          <div style={{ color: '#555' }}>No file open</div>
          <div style={{ fontSize: '11px', color: '#333' }}>
            Use <span style={{ color: '#FF00FF' }}>File → New File</span> or <span style={{ color: '#FF00FF' }}>File → Open File</span>
          </div>
        </div>
      )}
    </div>
  )
}

const EditorArea = forwardRef(EditorAreaComponent)
EditorArea.displayName = 'EditorArea'

export default EditorArea
