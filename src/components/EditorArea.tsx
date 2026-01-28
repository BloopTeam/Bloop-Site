import { useState, useRef, useEffect } from 'react'
import { X, ChevronRight, MoreHorizontal, ChevronDown, GitBranch } from 'lucide-react'
import { ToastMessage } from './Toast'

interface EditorAreaProps {
  onShowToast?: (type: ToastMessage['type'], message: string) => void
}

interface Tab {
  id: string
  name: string
  path: string[]
  content: string
  modified?: boolean
}

export default function EditorArea({ onShowToast }: EditorAreaProps) {
  const [tabs, setTabs] = useState<Tab[]>([
    { 
      id: '1', 
      name: 'App.tsx', 
      path: ['src', 'components'],
      modified: false,
      content: `import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1>Welcome to Bloop</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  )
}` 
    },
    { 
      id: '2', 
      name: 'seo_analyzer.py',
      path: ['src', 'utils'],
      modified: true, 
      content: `class SEOAnalyzer:
    def __init__(self, title, content):
        self.title = title
        self.content = content

    def score_title(self):
        length = len(self.title)
        if 50 <= length <= 60:
            return 10
        return 5` 
    },
  ])
  
  const [activeTab, setActiveTab] = useState('1')
  const [draggedTab, setDraggedTab] = useState<string | null>(null)
  const [dragOverTab, setDragOverTab] = useState<string | null>(null)
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set())
  const [foldedLines, setFoldedLines] = useState<Set<number>>(new Set())
  const [showMinimap, setShowMinimap] = useState(true)
  const [multiCursors, setMultiCursors] = useState<number[]>([])
  const tabsRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

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

  const highlightSyntax = (line: string) => {
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    return escaped
      .replace(/(\/\/.*$|#.*$)/g, '<span style="color:#6a9955;font-style:italic;">$1</span>')
      .replace(/(['"`])(.*?)(\1)/g, '<span style="color:#ce9178;">$1$2$3</span>')
      .replace(
        /\b(import|export|from|const|let|var|function|return|if|else|for|while|class|interface|type|new|this|async|await|def|elif|self|None|True|False)\b/g,
        '<span style="color:#c586c0;">$1</span>'
      )
      .replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, '<span style="color:#dcdcaa;">$1</span>')
      .replace(/\b\d+(\.\d+)?\b/g, '<span style="color:#b5cea8;">$&</span>')
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

  const highlightBrackets = (line: string): string => {
    const bracketPairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
    }
    
    let highlighted = line
    const stack: Array<{ char: string; index: number }> = []
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (bracketPairs[char]) {
        stack.push({ char, index: i })
      } else if (Object.values(bracketPairs).includes(char)) {
        if (stack.length > 0) {
          const last = stack.pop()
          if (last) {
            const pair = Object.entries(bracketPairs).find(([_, v]) => v === char)?.[0]
            if (pair === last.char) {
              // Colorize matching pair
              const before = highlighted.substring(0, last.index)
              const openChar = highlighted[last.index]
              const middle = highlighted.substring(last.index + 1, i)
              const closeChar = highlighted[i]
              const after = highlighted.substring(i + 1)
              highlighted = `${before}<span style="color:#FF00FF">${openChar}</span>${middle}<span style="color:#FF00FF">${closeChar}</span>${after}`
            }
          }
        }
      }
    }
    
    return highlighted
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#0f0f0f',
      overflow: 'hidden'
    }}>
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
                ref={editorRef}
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
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          No file open
        </div>
      )}
    </div>
  )
}
