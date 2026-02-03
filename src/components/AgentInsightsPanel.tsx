/**
 * Agent Insights Panel
 * Performance tracking, agent configuration, and insights dashboard
 */

import { useState, useEffect } from 'react'
import { 
  Activity, Settings, Zap, Clock, CheckCircle, XCircle,
  TrendingUp, Cpu, MemoryStick, Play, Pause, RefreshCw,
  ChevronRight, ToggleLeft, ToggleRight, X, BarChart3
} from 'lucide-react'
import { advancedAgentService, AgentConfig, AgentMetrics, AgentTask } from '../services/advancedAgents'

interface AgentInsightsPanelProps {
  onClose: () => void
}

export default function AgentInsightsPanel({ onClose }: AgentInsightsPanelProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [metrics, setMetrics] = useState<Map<string, AgentMetrics>>(new Map())
  const [recentTasks, setRecentTasks] = useState<AgentTask[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [aggregateMetrics, setAggregateMetrics] = useState({
    totalTasks: 0,
    successRate: 0,
    averageResponseTime: 0,
    totalTokens: 0,
    activeAgents: 0
  })

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadData = () => {
    setAgents(advancedAgentService.getAllAgents())
    const allMetrics = new Map<string, AgentMetrics>()
    advancedAgentService.getAllMetrics().forEach(m => allMetrics.set(m.agentId, m))
    setMetrics(allMetrics)
    setRecentTasks(advancedAgentService.getRecentTasks(10))
    setAggregateMetrics(advancedAgentService.getAggregateMetrics())
  }

  const toggleCapability = (agentId: string, capabilityId: string, enabled: boolean) => {
    advancedAgentService.updateAgentCapability(agentId, capabilityId, !enabled)
    loadData()
  }

  const runAgent = async (agentId: string) => {
    await advancedAgentService.executeTask(agentId, { file: 'example.ts', code: '// sample code' })
    loadData()
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTokens = (tokens: number) => {
    if (tokens < 1000) return tokens.toString()
    return `${(tokens / 1000).toFixed(1)}k`
  }

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  const selectedAgentData = selectedAgent ? agents.find(a => a.id === selectedAgent) : null
  const selectedAgentMetrics = selectedAgent ? metrics.get(selectedAgent) : null

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a0a',
      color: '#ccc'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} style={{ color: '#FF00FF' }} />
          <span style={{ fontWeight: 600 }}>Agent Insights</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Aggregate Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            padding: '14px',
            background: '#141414',
            borderRadius: '10px',
            border: '1px solid #1a1a1a'
          }}>
            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>
              Total Tasks
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#fff' }}>
              {aggregateMetrics.totalTasks}
            </div>
          </div>
          <div style={{
            padding: '14px',
            background: '#141414',
            borderRadius: '10px',
            border: '1px solid #1a1a1a'
          }}>
            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>
              Success Rate
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#22c55e' }}>
              {aggregateMetrics.successRate.toFixed(1)}%
            </div>
          </div>
          <div style={{
            padding: '14px',
            background: '#141414',
            borderRadius: '10px',
            border: '1px solid #1a1a1a'
          }}>
            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>
              Avg Response
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#3b82f6' }}>
              {formatDuration(aggregateMetrics.averageResponseTime)}
            </div>
          </div>
          <div style={{
            padding: '14px',
            background: '#141414',
            borderRadius: '10px',
            border: '1px solid #1a1a1a'
          }}>
            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>
              Active Agents
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#FF00FF' }}>
              {aggregateMetrics.activeAgents}
            </div>
          </div>
        </div>

        {/* Agent List */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>
            Specialized Agents
          </div>
          
          {agents.map((agent) => {
            const agentMetrics = metrics.get(agent.id)
            const isSelected = selectedAgent === agent.id

            return (
              <div key={agent.id}>
                <div
                  onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: isSelected ? '#1a1a1a' : '#141414',
                    borderRadius: isSelected ? '10px 10px 0 0' : '10px',
                    marginBottom: isSelected ? '0' : '8px',
                    cursor: 'pointer',
                    border: `1px solid ${isSelected ? agent.color : '#1a1a1a'}`,
                    borderBottom: isSelected ? 'none' : undefined
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: `${agent.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    {agent.icon}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      {agent.description}
                    </div>
                  </div>

                  {agentMetrics && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#fff' }}>
                        {agentMetrics.successfulTasks}/{agentMetrics.totalTasks}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666' }}>
                        {formatDuration(agentMetrics.averageResponseTime)}
                      </div>
                    </div>
                  )}

                  <ChevronRight 
                    size={16} 
                    style={{ 
                      color: '#666',
                      transform: isSelected ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s'
                    }} 
                  />
                </div>

                {/* Expanded Agent Details */}
                {isSelected && selectedAgentData && (
                  <div style={{
                    padding: '16px',
                    background: '#1a1a1a',
                    borderRadius: '0 0 10px 10px',
                    marginBottom: '8px',
                    border: `1px solid ${agent.color}`,
                    borderTop: 'none'
                  }}>
                    {/* Capabilities */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                        Capabilities
                      </div>
                      {selectedAgentData.capabilities.map((cap) => (
                        <div
                          key={cap.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: '#141414',
                            borderRadius: '6px',
                            marginBottom: '6px'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', color: cap.enabled ? '#fff' : '#666' }}>
                              {cap.name}
                            </div>
                            <div style={{ fontSize: '10px', color: '#555' }}>
                              {cap.description}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCapability(agent.id, cap.id, cap.enabled)
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: cap.enabled ? '#22c55e' : '#666'
                            }}
                          >
                            {cap.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Permissions */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                        Permissions
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {Object.entries(selectedAgentData.permissions).map(([key, value]) => (
                          <span
                            key={key}
                            style={{
                              padding: '4px 8px',
                              background: value ? '#22c55e20' : '#1a1a1a',
                              color: value ? '#22c55e' : '#666',
                              borderRadius: '4px',
                              fontSize: '10px'
                            }}
                          >
                            {key.replace('can', '')}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Memory Settings */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                        Memory
                      </div>
                      <div style={{
                        padding: '12px',
                        background: '#141414',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#fff' }}>
                            {selectedAgentData.memory.enabled ? 'Enabled' : 'Disabled'}
                          </div>
                          <div style={{ fontSize: '10px', color: '#666' }}>
                            {formatTokens(selectedAgentData.memory.maxContextSize)} tokens, {selectedAgentData.memory.retentionDays}d retention
                          </div>
                        </div>
                        <MemoryStick size={16} style={{ color: selectedAgentData.memory.enabled ? '#22c55e' : '#666' }} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          runAgent(agent.id)
                        }}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '10px',
                          background: agent.color,
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        <Play size={14} />
                        Run Agent
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          advancedAgentService.clearMemory(agent.id)
                          loadData()
                        }}
                        style={{
                          padding: '10px',
                          background: '#1a1a1a',
                          border: '1px solid #2a2a2a',
                          borderRadius: '6px',
                          color: '#888',
                          cursor: 'pointer'
                        }}
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Recent Tasks */}
        <div>
          <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>
            Recent Activity
          </div>
          
          {recentTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#555' }}>
              No recent tasks
            </div>
          ) : (
            recentTasks.map((task) => {
              const agent = agents.find(a => a.id === task.agentId)
              return (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: '#141414',
                    borderRadius: '8px',
                    marginBottom: '6px'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: task.status === 'completed' ? '#22c55e20' : '#ef444420',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {task.status === 'completed' ? (
                      <CheckCircle size={14} style={{ color: '#22c55e' }} />
                    ) : (
                      <XCircle size={14} style={{ color: '#ef4444' }} />
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#fff' }}>
                      {agent?.name || task.type}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                      {task.duration ? formatDuration(task.duration) : 'running'} • {formatTokens(task.tokens || 0)} tokens
                    </div>
                  </div>

                  <div style={{ fontSize: '10px', color: '#555' }}>
                    {task.completedAt ? getTimeAgo(task.completedAt) : 'now'}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
