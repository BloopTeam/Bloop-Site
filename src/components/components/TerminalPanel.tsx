import { useState, useRef, useEffect } from 'react'
import { X, Terminal, Trash2 } from 'lucide-react'
import { sanitizeCommand } from '../utils/security'

interface TerminalPanelProps {
  onClose: () => void
  height: number
  onResize: (delta: number) => void
}

interface TerminalLine {
  type: 'input' | 'output' | 'error'
  content: string
}

export default function TerminalPanel({ onClose, height, onResize }: TerminalPanelProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: 'output', content: 'Welcome to Bloop Terminal' },
    { type: 'output', content: 'Type "help" for available commands' },
    { type: 'output', content: '' },
  ])
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim()
    if (!trimmedCmd) return

    // Sanitize command input to prevent injection attacks
    const sanitizedCmd = sanitizeCommand(trimmedCmd)
    if (!sanitizedCmd) {
      setHistory(prev => [...prev, { type: 'error', content: 'Invalid command: contains dangerous characters' }])
      return
    }

    setCommandHistory(prev => [...prev, sanitizedCmd])
    setHistoryIndex(-1)

    const newLines: TerminalLine[] = [
      { type: 'input', content: `$ ${trimmedCmd}` }
    ]

    // Simulate some commands
    const command = trimmedCmd.toLowerCase().split(' ')[0]
    const args = trimmedCmd.split(' ').slice(1)

    switch (command) {
      case 'help':
        newLines.push(
          { type: 'output', content: 'Available commands:' },
          { type: 'output', content: '  help     - Show this help message' },
          { type: 'output', content: '  clear    - Clear the terminal' },
          { type: 'output', content: '  echo     - Echo a message' },
          { type: 'output', content: '  date     - Show current date/time' },
          { type: 'output', content: '  ls       - List files (simulated)' },
          { type: 'output', content: '  pwd      - Print working directory' },
          { type: 'output', content: '  whoami   - Show current user' },
        )
        break
      case 'clear':
        setHistory([])
        setInput('')
        return
      case 'echo':
        newLines.push({ type: 'output', content: args.join(' ') })
        break
      case 'date':
        newLines.push({ type: 'output', content: new Date().toString() })
        break
      case 'ls':
        newLines.push(
          { type: 'output', content: 'src/        public/     node_modules/' },
          { type: 'output', content: 'package.json    tsconfig.json   README.md' },
        )
        break
      case 'pwd':
        newLines.push({ type: 'output', content: '/home/user/bloop-project' })
        break
      case 'whoami':
        newLines.push({ type: 'output', content: 'developer' })
        break
      case 'npm':
      case 'yarn':
      case 'pnpm':
        newLines.push({ type: 'output', content: `Simulating ${trimmedCmd}...` })
        setTimeout(() => {
          setHistory(prev => [...prev, { type: 'output', content: '✓ Done!' }])
        }, 1000)
        break
      default:
        newLines.push({ type: 'error', content: `Command not found: ${command}` })
    }

    newLines.push({ type: 'output', content: '' })
    setHistory(prev => [...prev, ...newLines])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      } else {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY
      onResize(delta)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div style={{
      height: `${height}px`,
      minHeight: '100px',
      maxHeight: '500px',
      background: '#0a0a0a',
      borderTop: '1px solid #1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Fira Code', 'Consolas', monospace"
    }}>
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        onMouseDown={handleResizeMouseDown}
        style={{
          height: '4px',
          background: 'transparent',
          cursor: 'ns-resize',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#FF00FF'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid #1a1a1a',
        background: '#0f0f0f'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Terminal size={14} style={{ color: '#FF00FF' }} />
          <span style={{
            fontSize: '12px',
            color: '#888',
            fontFamily: "'Inter', sans-serif"
          }}>
            Terminal
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setHistory([])}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ccc'
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#555'
              e.currentTarget.style.background = 'transparent'
            }}
            title="Clear"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ccc'
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#555'
              e.currentTarget.style.background = 'transparent'
            }}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        onClick={() => inputRef.current?.focus()}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px',
          fontSize: '13px',
          lineHeight: 1.6,
          cursor: 'text'
        }}
      >
        {history.map((line, idx) => (
          <div
            key={idx}
            style={{
              color: line.type === 'error' ? '#ef4444' : (line.type === 'input' ? '#FF00FF' : '#888'),
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}
          >
            {line.content}
          </div>
        ))}

        {/* Input Line */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ color: '#FF00FF' }}>$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ccc',
              fontSize: '13px',
              fontFamily: "'Fira Code', 'Consolas', monospace",
              caretColor: '#FF00FF'
            }}
          />
        </div>
      </div>
    </div>
  )
}
