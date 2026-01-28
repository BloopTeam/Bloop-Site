import { useState, useEffect } from 'react'
import { Check, X, AlertCircle, Info } from 'lucide-react'

export interface ToastAction {
  label: string
  action: () => void
  primary?: boolean
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
  actions?: ToastAction[]
  group?: string
  timestamp?: Date
  sound?: boolean
}

interface ToastProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
  doNotDisturb?: boolean
  onToggleDND?: () => void
  showHistory?: boolean
  onShowHistory?: () => void
  soundEnabled?: boolean
  onToggleSound?: () => void
}

interface NotificationHistory {
  id: string
  type: ToastMessage['type']
  message: string
  timestamp: Date
  read: boolean
}

export default function Toast({ 
  toasts, 
  onRemove, 
  doNotDisturb = false,
  onToggleDND,
  showHistory = false,
  onShowHistory,
  soundEnabled = true,
  onToggleSound
}: ToastProps) {
  // Group notifications by type
  const groupedToasts = toasts.reduce((acc, toast) => {
    const group = toast.group || 'default'
    if (!acc[group]) acc[group] = []
    acc[group].push(toast)
    return acc
  }, {} as Record<string, ToastMessage[]>)

  // Play sound for new notifications
  useEffect(() => {
    if (soundEnabled && toasts.length > 0 && !doNotDisturb) {
      // Simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    }
  }, [toasts.length, soundEnabled, doNotDisturb])

  return (
    <div style={{
      position: 'fixed',
      bottom: '40px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 9999
    }}>
      {!doNotDisturb && Object.entries(groupedToasts).map(([group, groupToasts]) => (
        <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {groupToasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
          ))}
        </div>
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration || 3000)

    return () => clearTimeout(timer)
  }, [toast, onRemove])

  const icons = {
    success: <Check size={16} />,
    error: <X size={16} />,
    warning: <AlertCircle size={16} />,
    info: <Info size={16} />
  }

  const colors = {
    success: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', icon: '#22c55e' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', icon: '#ef4444' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', icon: '#f59e0b' },
    info: { bg: 'rgba(255, 0, 255, 0.15)', border: '#FF00FF', icon: '#FF00FF' }
  }

  const style = colors[toast.type]

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      background: '#1a1a1a',
      border: `1px solid ${style.border}`,
      borderRadius: '8px',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
      minWidth: '280px',
      maxWidth: '400px',
      animation: isLeaving ? 'slideOut 0.3s ease-out forwards' : 'slideIn 0.3s ease-out',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        background: style.bg,
        color: style.icon,
        flexShrink: 0
      }}>
        {icons[toast.type]}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{
          color: '#cccccc',
          fontSize: '13px',
          lineHeight: 1.4
        }}>
          {toast.message}
        </span>
        {toast.actions && toast.actions.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            {toast.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  action.action()
                  setIsLeaving(true)
                  setTimeout(() => onRemove(toast.id), 300)
                }}
                style={{
                  padding: '4px 12px',
                  background: action.primary ? '#FF00FF' : 'transparent',
                  border: action.primary ? 'none' : '1px solid #3e3e42',
                  borderRadius: '4px',
                  color: action.primary ? '#ffffff' : '#cccccc',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (!action.primary) {
                    e.currentTarget.style.borderColor = '#FF00FF'
                    e.currentTarget.style.color = '#FF00FF'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!action.primary) {
                    e.currentTarget.style.borderColor = '#3e3e42'
                    e.currentTarget.style.color = '#cccccc'
                  }
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => {
          setIsLeaving(true)
          setTimeout(() => onRemove(toast.id), 300)
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#666',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '4px',
          transition: 'all 0.15s',
          alignSelf: 'flex-start'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ccc'
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#666'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  )
}
