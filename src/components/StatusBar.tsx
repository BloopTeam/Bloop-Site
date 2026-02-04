import { Terminal, GitBranch, Bell, Check, AlertCircle, Activity, Zap, Shield, Plug, Users, Layout, Cpu, TestTube } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiService } from '../services/api'
import { openClawService } from '../services/openclaw'
import { moltbookService } from '../services/moltbook'

interface StatusBarProps {
  readonly terminalVisible?: boolean
  readonly onToggleTerminal?: () => void
  readonly onPanelChange?: (panel: 'collaboration' | 'agents' | 'project' | 'automation') => void
  readonly onShowGitBranch?: () => void
  readonly onShowProblems?: () => void
  readonly onShowNotifications?: () => void
  readonly onOpenPreferences?: () => void
}

export default function StatusBar({ 
  terminalVisible, 
  onToggleTerminal, 
  onPanelChange,
  onShowGitBranch,
  onShowProblems,
  onShowNotifications,
  onOpenPreferences
}: StatusBarProps) {
  const [metrics, setMetrics] = useState<{
    queue_status: { queue_size: number; queue_capacity: number; concurrent_tasks: number; max_concurrent: number; circuit_breaker_open: boolean }
    health_status: { unhealthy_agents: number; unhealthy_agent_ids: string[] }
    active_agents: number
    active_tasks: number
    success_rate: number
  } | null>(null)

  // OpenClaw and Moltbook status
  const [openClawConnected, setOpenClawConnected] = useState(false)
  const [moltbookRegistered, setMoltbookRegistered] = useState(false)
  const [openClawSkills, setOpenClawSkills] = useState(0)

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
      } catch {
        // Silently fail - metrics are optional
      }
    }

    // Check OpenClaw status
    const checkOpenClaw = async () => {
      setOpenClawConnected(openClawService.isConnected())
      if (openClawService.isConnected()) {
        const skills = await openClawService.listSkills()
        setOpenClawSkills(skills.length)
      }
    }

    // Check Moltbook status
    const checkMoltbook = () => {
      setMoltbookRegistered(moltbookService.isRegistered())
    }

    // Only fetch metrics once on mount, don't poll (backend may not be running)
    fetchMetrics()
    checkOpenClaw()
    checkMoltbook()

    // Poll less frequently since backend may not be available
    const metricsInterval = setInterval(fetchMetrics, 30000)
    const openClawInterval = setInterval(checkOpenClaw, 10000)
    
    // Listen for OpenClaw connection events
    const unsubConnect = openClawService.on('connected', () => setOpenClawConnected(true))
    const unsubDisconnect = openClawService.on('disconnected', () => setOpenClawConnected(false))

    return () => {
      clearInterval(metricsInterval)
      clearInterval(openClawInterval)
      unsubConnect()
      unsubDisconnect()
    }
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
          onClick={() => {
            onShowGitBranch?.()
            // Also switch to git view in sidebar if available
          }}
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
          title="Click to switch Git branch or view Git panel"
        >
          <GitBranch size={12} />
          <span>main</span>
        </button>

        {/* Sync indicator - Click to sync/pull/push */}
        <button 
          onClick={() => {
            // Trigger git sync/pull/push
            onShowGitBranch?.()
          }}
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
          title="Click to sync Git (pull/push)"
        >
          <Check size={12} />
        </button>

        {/* Problems */}
        <button 
          onClick={() => {
            onShowProblems?.()
            // Switch to problems view or show problems panel
          }}
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
          title="Click to view problems and errors"
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
        {/* Line/Column - Click to go to line */}
        <button 
          onClick={() => {
            // Trigger go to line command (Ctrl+G)
            const event = new KeyboardEvent('keydown', { 
              key: 'g', 
              ctrlKey: true, 
              bubbles: true 
            })
            document.dispatchEvent(event)
          }}
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
          title="Click to go to line (Ctrl+G)"
        >
          Ln 1, Col 1
        </button>

        {/* Spaces - Click to change indentation */}
        <button 
          onClick={() => {
            onOpenPreferences?.()
            // Could also cycle through 2, 4, 8 spaces
          }}
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
          title="Click to change indentation settings"
        >
          Spaces: 2
        </button>

        {/* Encoding - Click to change encoding */}
        <button 
          onClick={() => {
            onOpenPreferences?.()
            // Show encoding selector
          }}
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
          title="Click to change file encoding"
        >
          UTF-8
        </button>

        {/* Language - Click to change language mode */}
        <button 
          onClick={() => {
            onOpenPreferences?.()
            // Show language selector or detect from file
          }}
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
          title="Click to change language mode"
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

        {/* OpenClaw Status */}
        <button 
          onClick={() => {
            if (!openClawConnected) {
              openClawService.connect()
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            background: openClawConnected ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
            border: 'none',
            color: openClawConnected ? '#22c55e' : '#ffffff',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '3px',
            transition: 'background 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = openClawConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = openClawConnected ? 'rgba(34, 197, 94, 0.2)' : 'transparent'}
          title={openClawConnected ? `OpenClaw: Connected (${openClawSkills} skills)` : 'OpenClaw: Click to connect'}
        >
          <Plug size={12} />
          <span style={{ fontSize: '9px' }}>OC</span>
        </button>

        {/* Moltbook Status */}
        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            background: moltbookRegistered ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
            border: 'none',
            color: moltbookRegistered ? '#a855f7' : '#ffffff',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '3px',
            transition: 'background 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = moltbookRegistered ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = moltbookRegistered ? 'rgba(168, 85, 247, 0.2)' : 'transparent'}
          title={moltbookRegistered ? 'Moltbook: Registered' : 'Moltbook: Not registered'}
        >
          <Users size={12} />
          <span style={{ fontSize: '9px' }}>MB</span>
        </button>

        {/* Collaboration */}
        <button 
          onClick={() => onPanelChange?.('collaboration')}
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
          title="Collaboration"
        >
          <Users size={12} />
        </button>

        {/* Agent Insights */}
        <button 
          onClick={() => onPanelChange?.('agents')}
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
          title="Agent Insights"
        >
          <Cpu size={12} />
        </button>

        {/* Project Insights */}
        <button 
          onClick={() => onPanelChange?.('project')}
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
          title="Project Insights"
        >
          <Layout size={12} />
        </button>

        {/* Automation & Testing */}
        <button 
          onClick={() => onPanelChange?.('automation')}
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
          title="Automation & Testing"
        >
          <TestTube size={12} />
        </button>

        {/* Notifications */}
        <button 
          onClick={() => {
            onShowNotifications?.()
            // Show notifications panel or dropdown
          }}
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
          title="Click to view notifications"
        >
          <Bell size={12} />
        </button>
      </div>
    </div>
  )
}
