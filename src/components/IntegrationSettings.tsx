/**
 * Integration Settings Component
 * Configure OpenClaw and Moltbook integrations
 */
import { useState, useEffect } from 'react'
import { Plug, Users, Settings, Check, X, RefreshCw, ExternalLink, Zap } from 'lucide-react'
import { openClawService } from '../services/openclaw'
import { moltbookService } from '../services/moltbook'
import { apiService } from '../services/api'
import type { OpenClawSkill } from '../types/openclaw'

interface IntegrationSettingsProps {
  readonly onClose?: () => void
}

export default function IntegrationSettings({ onClose }: IntegrationSettingsProps) {
  const [activeTab, setActiveTab] = useState<'openclaw' | 'moltbook'>('openclaw')
  
  // OpenClaw state
  const [openClawConnected, setOpenClawConnected] = useState(false)
  const [openClawConnecting, setOpenClawConnecting] = useState(false)
  const [openClawSkills, setOpenClawSkills] = useState<OpenClawSkill[]>([])
  const [openClawGatewayUrl, setOpenClawGatewayUrl] = useState('ws://127.0.0.1:18789')
  
  // Moltbook state
  const [moltbookRegistered, setMoltbookRegistered] = useState(false)
  const [moltbookProfile, setMoltbookProfile] = useState<{
    id: string
    username: string
    display_name: string
    karma: number
  } | null>(null)
  const [registering, setRegistering] = useState(false)
  const [claimLink, setClaimLink] = useState<string | null>(null)

  useEffect(() => {
    // Check initial status
    setOpenClawConnected(openClawService.isConnected())
    setMoltbookRegistered(moltbookService.isRegistered())
    
    // Load skills if connected
    if (openClawService.isConnected()) {
      loadOpenClawSkills()
    }
    
    // Load Moltbook profile if registered
    loadMoltbookProfile()
  }, [])

  const loadOpenClawSkills = async () => {
    try {
      const { skills } = await apiService.getOpenClawSkills()
      setOpenClawSkills(skills.map(s => ({
        name: s.name,
        description: s.description,
        path: '',
        enabled: s.enabled,
        type: s.skill_type as 'workspace' | 'bundled' | 'managed',
        capabilities: s.capabilities
      })))
    } catch {
      // Use WebSocket if API fails
      const skills = await openClawService.listSkills()
      setOpenClawSkills(skills)
    }
  }

  const loadMoltbookProfile = async () => {
    try {
      const profile = await apiService.getMoltbookProfile()
      if (profile) {
        setMoltbookProfile(profile)
        setMoltbookRegistered(true)
      }
    } catch {
      // Silent fail
    }
  }

  const handleOpenClawConnect = async () => {
    setOpenClawConnecting(true)
    try {
      openClawService.updateConfig({ gatewayUrl: openClawGatewayUrl })
      const connected = await openClawService.connect()
      setOpenClawConnected(connected)
      if (connected) {
        await loadOpenClawSkills()
      }
    } finally {
      setOpenClawConnecting(false)
    }
  }

  const handleOpenClawDisconnect = () => {
    openClawService.disconnect()
    setOpenClawConnected(false)
    setOpenClawSkills([])
  }

  const handleMoltbookRegister = async () => {
    setRegistering(true)
    try {
      const link = await apiService.registerWithMoltbook()
      setClaimLink(link.url)
    } finally {
      setRegistering(false)
    }
  }

  const tabStyle = (isActive: boolean) => ({
    padding: '8px 16px',
    background: isActive ? '#3c3c3c' : 'transparent',
    border: 'none',
    color: isActive ? '#ffffff' : '#888888',
    cursor: 'pointer',
    fontSize: '12px',
    borderRadius: '4px 4px 0 0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  })

  const getButtonBackground = (variant: 'primary' | 'secondary' | 'danger') => {
    if (variant === 'primary') return '#007acc'
    if (variant === 'danger') return '#d32f2f'
    return '#3c3c3c'
  }

  const buttonStyle = (variant: 'primary' | 'secondary' | 'danger' = 'primary') => ({
    padding: '8px 16px',
    background: getButtonBackground(variant),
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '12px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  })

  return (
    <div style={{
      background: '#252526',
      borderRadius: '8px',
      width: '600px',
      maxHeight: '80vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #3c3c3c'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} color="#cccccc" />
          <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>Integration Settings</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888888',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #3c3c3c' }}>
        <button
          onClick={() => setActiveTab('openclaw')}
          style={tabStyle(activeTab === 'openclaw')}
        >
          <Plug size={14} />
          OpenClaw
        </button>
        <button
          onClick={() => setActiveTab('moltbook')}
          style={tabStyle(activeTab === 'moltbook')}
        >
          <Users size={14} />
          Moltbook
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {activeTab === 'openclaw' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Connection Status */}
            <div style={{
              padding: '12px',
              background: openClawConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {openClawConnected ? (
                  <Check size={16} color="#22c55e" />
                ) : (
                  <X size={16} color="#ef4444" />
                )}
                <span style={{ color: '#cccccc', fontSize: '13px' }}>
                  {openClawConnected ? 'Connected to OpenClaw Gateway' : 'Not connected'}
                </span>
              </div>
              {openClawConnected ? (
                <button onClick={handleOpenClawDisconnect} style={buttonStyle('danger')}>
                  Disconnect
                </button>
              ) : (
                <button 
                  onClick={handleOpenClawConnect} 
                  style={buttonStyle('primary')}
                  disabled={openClawConnecting}
                >
                  {openClawConnecting ? <RefreshCw size={14} className="animate-spin" /> : <Plug size={14} />}
                  {openClawConnecting ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>

            {/* Gateway URL */}
            <div>
              <label 
                htmlFor="gateway-url-input"
                style={{ color: '#888888', fontSize: '12px', display: 'block', marginBottom: '6px' }}
              >
                Gateway URL
              </label>
              <input
                id="gateway-url-input"
                type="text"
                value={openClawGatewayUrl}
                onChange={(e) => setOpenClawGatewayUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1e1e1e',
                  border: '1px solid #3c3c3c',
                  borderRadius: '4px',
                  color: '#cccccc',
                  fontSize: '13px'
                }}
                placeholder="ws://127.0.0.1:18789"
              />
            </div>

            {/* Skills */}
            {openClawConnected && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ color: '#888888', fontSize: '12px' }}>
                    Available Skills ({openClawSkills.length})
                  </span>
                  <button onClick={loadOpenClawSkills} style={{ ...buttonStyle('secondary'), padding: '4px 8px' }}>
                    <RefreshCw size={12} />
                  </button>
                </div>
                <div style={{ 
                  background: '#1e1e1e', 
                  borderRadius: '6px', 
                  maxHeight: '200px', 
                  overflow: 'auto' 
                }}>
                  {openClawSkills.map((skill) => (
                    <div
                      key={skill.name}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #3c3c3c',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ color: '#ffffff', fontSize: '13px' }}>{skill.name}</div>
                        <div style={{ color: '#888888', fontSize: '11px' }}>{skill.description}</div>
                      </div>
                      <Zap size={14} color={skill.enabled ? '#22c55e' : '#888888'} />
                    </div>
                  ))}
                  {openClawSkills.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888888', fontSize: '12px' }}>
                      No skills available
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info */}
            <div style={{ 
              padding: '12px', 
              background: '#1e1e1e', 
              borderRadius: '6px',
              fontSize: '12px',
              color: '#888888'
            }}>
              <p style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#cccccc' }}>OpenClaw</strong> enables multi-agent orchestration, 
                cross-platform messaging, and AI skill execution.
              </p>
              <a 
                href="https://github.com/openclaw/openclaw" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#007acc', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Learn more <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {activeTab === 'moltbook' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Registration Status */}
            <div style={{
              padding: '12px',
              background: moltbookRegistered ? 'rgba(168, 85, 247, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderRadius: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {moltbookRegistered ? (
                    <Check size={16} color="#a855f7" />
                  ) : (
                    <X size={16} color="#ef4444" />
                  )}
                  <span style={{ color: '#cccccc', fontSize: '13px' }}>
                    {moltbookRegistered ? 'Registered as @bloop' : 'Not registered'}
                  </span>
                </div>
                {!moltbookRegistered && (
                  <button 
                    onClick={handleMoltbookRegister} 
                    style={buttonStyle('primary')}
                    disabled={registering}
                  >
                    {registering ? 'Registering...' : 'Register'}
                  </button>
                )}
              </div>
              {claimLink && (
                <div style={{ marginTop: '12px', padding: '8px', background: '#1e1e1e', borderRadius: '4px' }}>
                  <p style={{ color: '#888888', fontSize: '11px', marginBottom: '4px' }}>
                    Claim your agent profile:
                  </p>
                  <a 
                    href={claimLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#007acc', fontSize: '12px', wordBreak: 'break-all' }}
                  >
                    {claimLink}
                  </a>
                </div>
              )}
            </div>

            {/* Profile */}
            {moltbookProfile && (
              <div style={{ 
                padding: '16px', 
                background: '#1e1e1e', 
                borderRadius: '6px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '18px'
                  }}>
                    B
                  </div>
                  <div>
                    <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>
                      {moltbookProfile.display_name}
                    </div>
                    <div style={{ color: '#888888', fontSize: '12px' }}>
                      @{moltbookProfile.username} · {moltbookProfile.karma} karma
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div style={{ 
              padding: '12px', 
              background: '#1e1e1e', 
              borderRadius: '6px',
              fontSize: '12px',
              color: '#888888'
            }}>
              <p style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#cccccc' }}>Moltbook</strong> is a social network for AI agents. 
                Share code, discover skills, and connect with other AI assistants.
              </p>
              <a 
                href="https://moltbook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#007acc', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Visit Moltbook <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
