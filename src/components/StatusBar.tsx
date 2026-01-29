import { Terminal, GitBranch, Bell, Check, AlertCircle, Activity, Zap, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiService } from '../services/api'

interface StatusBarProps {
  terminalVisible?: boolean
  onToggleTerminal?: () => void
}

export default function StatusBar({ terminalVisible, onToggleTerminal }: StatusBarProps) {
  const [metrics, setMetrics] = useState<{
    queue_status: { queue_size: number; queue_capacity: number; concurrent_tasks: number; max_concurrent: number; circuit_breaker_open: boolean }
    health_status: { unhealthy_agents: number; unhealthy_agent_ids: string[] }
    active_agents: number
    active_tasks: number
    success_rate: number
  } | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await apiService.getAgentMetrics()
        setMetrics({
          queue_status: data.queue_status,
          health_status: data.health_status,
          active_agents: data.active_agents,
          active_tasks: data.active_tasks,
          success_rate: data.success_rate
        })
      } catch (error) {
        // Silently fail - metrics are optional
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])
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

        {/* Agent Metrics - Phase 2 */}
        {metrics && (
          <>
            {/* Queue Status */}
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                background: metrics.queue_status.queue_size > metrics.queue_status.queue_capacity * 0.8 
                  ? 'rgba(239, 68, 68, 0.2)' 
                  : 'transparent',
                border: 'none',
                color: metrics.queue_status.queue_size > metrics.queue_status.queue_capacity * 0.8 
                  ? '#ff6b6b' 
                  : '#ffffff',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '3px',
                transition: 'background 0.1s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = metrics.queue_status.queue_size > metrics.queue_status.queue_capacity * 0.8 
                  ? 'rgba(239, 68, 68, 0.2)' 
                  : 'transparent'
              }}
              title={`Queue: ${metrics.queue_status.queue_size}/${metrics.queue_status.queue_capacity} | Concurrent: ${metrics.queue_status.concurrent_tasks}/${metrics.queue_status.max_concurrent}`}
            >
              <Activity size={12} />
              <span>{metrics.queue_status.queue_size}/{metrics.queue_status.queue_capacity}</span>
            </button>

            {/* Active Tasks */}
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
              title={`Active: ${metrics.active_tasks} tasks, ${metrics.active_agents} agents`}
            >
              <Zap size={12} />
              <span>{metrics.active_tasks}</span>
            </button>

            {/* Health Status */}
            {metrics.health_status.unhealthy_agents > 0 && (
              <button 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: 'none',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  fontSize: '11px',
                  borderRadius: '3px',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                title={`${metrics.health_status.unhealthy_agents} unhealthy agent(s)`}
              >
                <Shield size={12} />
                <span>{metrics.health_status.unhealthy_agents}</span>
              </button>
            )}

            {/* Circuit Breaker Status */}
            {metrics.queue_status.circuit_breaker_open && (
              <button 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  background: 'rgba(239, 68, 68, 0.3)',
                  border: 'none',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  fontSize: '11px',
                  borderRadius: '3px',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
                title="Circuit breaker is open - system protecting against failures"
              >
                <AlertCircle size={12} />
                <span>CB</span>
              </button>
            )}
          </>
        )}
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
