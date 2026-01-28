import { Terminal, GitBranch, Bell, Check, AlertCircle } from 'lucide-react'

interface StatusBarProps {
  terminalVisible?: boolean
  onToggleTerminal?: () => void
}

export default function StatusBar({ terminalVisible, onToggleTerminal }: StatusBarProps) {
  return (
    <div style={{
      height: '24px',
      background: '#007acc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 8px',
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {/* Branch indicator */}
        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '3px',
            transition: 'background 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <GitBranch size={12} />
          <span>main</span>
        </button>

        {/* Sync indicator */}
        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '3px',
            transition: 'background 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Check size={12} />
        </button>

        {/* Problems */}
        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '3px',
            transition: 'background 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <AlertCircle size={12} />
          <span>0</span>
        </button>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {/* Line/Column */}
        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '2px 8px',
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '3px',
            transition: 'background 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          Ln 1, Col 1
        </button>

        {/* Spaces */}
        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '2px 8px',
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '3px',
            transition: 'background 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          Spaces: 2
        </button>

        {/* Encoding */}
        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '2px 8px',
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '3px',
            transition: 'background 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          UTF-8
        </button>

        {/* Language */}
        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '2px 8px',
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '3px',
            transition: 'background 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          TypeScript React
        </button>

        {/* Terminal Toggle */}
        <button 
          onClick={onToggleTerminal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            background: terminalVisible ? 'rgba(255,255,255,0.15)' : 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '3px',
            transition: 'background 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = terminalVisible ? 'rgba(255,255,255,0.15)' : 'transparent'}
          title="Toggle Terminal (Ctrl+`)"
        >
          <Terminal size={12} />
        </button>

        {/* Notifications */}
        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '2px 8px',
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '3px',
            transition: 'background 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Bell size={12} />
        </button>
      </div>
    </div>
  )
}
