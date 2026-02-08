import { useState, useEffect } from 'react'
import { X, Lightbulb, ChevronRight } from 'lucide-react'

export default function BeginnerGuide() {
  const [dismissed, setDismissed] = useState(
    localStorage.getItem('bloop-guide-dismissed') === 'true'
  )
  const [currentTip, setCurrentTip] = useState(0)

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (dismissed) return
    const timer = setTimeout(() => {
      setDismissed(true)
      localStorage.setItem('bloop-guide-dismissed', 'true')
    }, 8000)
    return () => clearTimeout(timer)
  }, [dismissed])

  const tips = [
    {
      title: 'Welcome to Bloop!',
      content: 'Press Ctrl+K (Cmd+K on Mac) to open the command palette and access all features quickly.'
    },
    {
      title: 'Quick File Navigation',
      content: 'Use Ctrl+P (Cmd+P) to quickly open files. Start typing the file name to search.'
    },
    {
      title: 'AI Assistant',
      content: 'The right panel contains Bloop AI. Ask questions, get code suggestions, or debug issues.'
    },
    {
      title: 'Keyboard Shortcuts',
      content: 'Ctrl+B toggles the sidebar, Ctrl+` opens terminal, and Ctrl+/ shows all shortcuts.'
    },
    {
      title: 'Multiple Tabs',
      content: 'You can open multiple files in tabs. Click the X to close, or middle-click for quick close.'
    }
  ]

  if (dismissed) return null

  const current = tips[currentTip]

  return (
    <div style={{
      position: 'fixed',
      bottom: '32px',
      right: '420px',
      width: '320px',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #0d0b12 100%)',
      border: '1px solid rgba(205, 184, 232, 0.3)',
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(205, 184, 232, 0.2)',
      zIndex: 100,
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(205, 184, 232, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lightbulb size={18} style={{ color: '#cdb8e8' }} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#cdb8e8' }}>
            Quick Tips
          </span>
        </div>
        <button
          onClick={() => {
            setDismissed(true)
            localStorage.setItem('bloop-guide-dismissed', 'true')
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#cdb8e8',
            cursor: 'pointer',
            padding: '4px',
            opacity: 0.7
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#cdb8e8',
          marginBottom: '8px'
        }}>
          {current.title}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#cdb8e8',
          lineHeight: '1.5',
          opacity: 0.75
        }}>
          {current.content}
        </div>
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(205, 184, 232, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%)'
      }}>
        <div style={{
          fontSize: '11px',
          color: '#cdb8e8',
          opacity: 0.6
        }}>
          {currentTip + 1} of {tips.length}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {currentTip > 0 && (
            <button
              onClick={() => setCurrentTip(currentTip - 1)}
              style={{
                padding: '4px 8px',
                background: 'rgba(205, 184, 232, 0.1)',
                border: '1px solid rgba(205, 184, 232, 0.3)',
                borderRadius: '4px',
                color: '#cdb8e8',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Previous
            </button>
          )}
          {currentTip < tips.length - 1 ? (
            <button
              onClick={() => setCurrentTip(currentTip + 1)}
              style={{
                padding: '4px 8px',
                background: 'rgba(205, 184, 232, 0.3)',
                border: 'none',
                borderRadius: '4px',
                color: '#cdb8e8',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Next
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => {
                setDismissed(true)
                localStorage.setItem('bloop-guide-dismissed', 'true')
              }}
              style={{
                padding: '4px 8px',
                background: 'rgba(205, 184, 232, 0.3)',
                border: 'none',
                borderRadius: '4px',
                color: '#cdb8e8',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Got it!
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
