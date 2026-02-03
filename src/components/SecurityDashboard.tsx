/**
 * Security Dashboard Component
 * 
 * Displays:
 * - Security audit logs
 * - Threat detection events
 * - Vulnerability scan results
 * - Rate limiting status
 * - Security metrics
 */
import React, { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity, Lock, Eye } from 'lucide-react'
import { apiService } from '../services/api'

interface SecurityEvent {
  id: string
  timestamp: string
  event_type: string
  severity: string
  description: string
  source?: string
}

interface Vulnerability {
  id: string
  severity: string
  description: string
  affected_files: string[]
  fix_suggestion?: string
}

export function SecurityDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([])
  const [activeTab, setActiveTab] = useState<'events' | 'vulnerabilities' | 'metrics'>('events')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSecurityData()
    const interval = setInterval(loadSecurityData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const loadSecurityData = async () => {
    setLoading(true)
    try {
      const [eventsData, vulnsData] = await Promise.all([
        apiService.getSecurityEvents(),
        apiService.getVulnerabilities()
      ])
      setEvents(eventsData)
      setVulnerabilities(vulnsData)
    } catch {
      // Security data unavailable - will show empty state
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return '#ff4444'
      case 'high': return '#ff8800'
      case 'medium': return '#ffaa00'
      case 'low': return '#4488ff'
      default: return '#888888'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return <XCircle size={16} style={{ color: getSeverityColor(severity) }} />
      case 'medium':
        return <AlertTriangle size={16} style={{ color: getSeverityColor(severity) }} />
      default:
        return <CheckCircle size={16} style={{ color: getSeverityColor(severity) }} />
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#1e1e1e', color: '#cccccc' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: '#3e3e42' }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={18} style={{ color: '#007acc' }} />
          <div className="text-sm font-medium">Security Dashboard</div>
        </div>
        <div className="text-xs" style={{ color: '#858585' }}>
          Real-time security monitoring and threat detection
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: '#3e3e42' }}>
        {[
          { id: 'events' as const, label: 'Events', count: events.length },
          { id: 'vulnerabilities' as const, label: 'Vulnerabilities', count: vulnerabilities.length },
          { id: 'metrics' as const, label: 'Metrics', count: 0 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-xs font-medium relative"
            style={{
              color: activeTab === tab.id ? '#ffffff' : '#858585',
              backgroundColor: activeTab === tab.id ? '#2d2d30' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #007acc' : 'none',
              cursor: 'pointer'
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#3e3e42' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-sm text-center py-8" style={{ color: '#858585' }}>
            Loading security data...
          </div>
        ) : (
          <>
            {activeTab === 'events' && (
              <div className="space-y-2">
                {events.length === 0 ? (
                  <div className="text-sm text-center py-8" style={{ color: '#858585' }}>
                    No security events
                  </div>
                ) : (
                  events.map(event => (
                    <div
                      key={event.id}
                      className="p-3 rounded border"
                      style={{
                        backgroundColor: '#252526',
                        borderColor: getSeverityColor(event.severity)
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityIcon(event.severity)}
                        <span className="text-sm font-medium">{event.event_type}</span>
                        <span className="text-xs ml-auto" style={{ color: '#858585' }}>
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs mb-1" style={{ color: '#858585' }}>
                        {event.description}
                      </div>
                      {event.source && (
                        <div className="text-xs" style={{ color: '#666' }}>
                          Source: {event.source}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'vulnerabilities' && (
              <div className="space-y-2">
                {vulnerabilities.length === 0 ? (
                  <div className="text-sm text-center py-8" style={{ color: '#858585' }}>
                    No vulnerabilities detected
                  </div>
                ) : (
                  vulnerabilities.map(vuln => (
                    <div
                      key={vuln.id}
                      className="p-3 rounded border"
                      style={{
                        backgroundColor: '#252526',
                        borderColor: getSeverityColor(vuln.severity)
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityIcon(vuln.severity)}
                        <span className="text-sm font-medium">{vuln.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ 
                          backgroundColor: getSeverityColor(vuln.severity),
                          color: '#ffffff'
                        }}>
                          {vuln.severity}
                        </span>
                      </div>
                      <div className="text-xs mb-2" style={{ color: '#858585' }}>
                        {vuln.description}
                      </div>
                      {vuln.affected_files.length > 0 && (
                        <div className="text-xs mb-2" style={{ color: '#666' }}>
                          Affected: {vuln.affected_files.join(', ')}
                        </div>
                      )}
                      {vuln.fix_suggestion && (
                        <div className="text-xs mt-2 p-2 rounded" style={{ backgroundColor: '#1e1e1e' }}>
                          <strong>Fix:</strong> {vuln.fix_suggestion}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'metrics' && (
              <div className="space-y-4">
                <div className="p-4 rounded" style={{ backgroundColor: '#252526' }}>
                  <div className="text-sm font-medium mb-2">Security Metrics</div>
                  <div className="text-xs space-y-1" style={{ color: '#858585' }}>
                    <div>Total Events: {events.length}</div>
                    <div>Critical Threats: {events.filter(e => e.severity === 'critical').length}</div>
                    <div>Vulnerabilities: {vulnerabilities.length}</div>
                    <div>High Severity: {vulnerabilities.filter(v => v.severity === 'high').length}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
