/**
 * Plugin Management Panel
 * Advanced plugin system UI for installing, configuring, and managing plugins
 */

import { useState, useEffect } from 'react'
import { 
  X, Plus, Settings, Power, PowerOff, RefreshCw, Trash2, 
  Download, Package, Shield, AlertCircle, CheckCircle, Loader2
} from 'lucide-react'
import { pluginSystemService, Plugin, PluginManifest } from '../services/pluginSystem'

interface PluginManagementPanelProps {
  onClose: () => void
  onOpenMarketplace?: () => void
}

export default function PluginManagementPanel({ onClose, onOpenMarketplace }: PluginManagementPanelProps) {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    loadPlugins()

    const unsubscribe = pluginSystemService.on('plugin-state-changed', () => {
      loadPlugins()
    })

    return () => unsubscribe()
  }, [])

  const loadPlugins = () => {
    setPlugins(pluginSystemService.getAllPlugins())
  }

  const handleTogglePlugin = async (pluginId: string) => {
    const plugin = plugins.find(p => p.id === pluginId)
    if (!plugin) return

    setLoading({ ...loading, [pluginId]: true })
    
    try {
      if (plugin.enabled) {
        await pluginSystemService.deactivatePlugin(pluginId)
      } else {
        await pluginSystemService.activatePlugin(pluginId)
      }
    } catch (error) {
      console.error('Failed to toggle plugin:', error)
    } finally {
      setLoading({ ...loading, [pluginId]: false })
      loadPlugins()
    }
  }

  const handleUninstallPlugin = async (pluginId: string) => {
    if (!confirm('Are you sure you want to uninstall this plugin?')) return

    setLoading({ ...loading, [pluginId]: true })
    
    try {
      await pluginSystemService.uninstallPlugin(pluginId)
    } catch (error) {
      console.error('Failed to uninstall plugin:', error)
    } finally {
      setLoading({ ...loading, [pluginId]: false })
      loadPlugins()
      if (selectedPlugin === pluginId) {
        setSelectedPlugin(null)
      }
    }
  }

  const handleHotReload = async (pluginId: string) => {
    setLoading({ ...loading, [pluginId]: true })
    
    try {
      await pluginSystemService.hotReloadPlugin(pluginId)
    } catch (error) {
      console.error('Failed to hot reload plugin:', error)
    } finally {
      setLoading({ ...loading, [pluginId]: false })
      loadPlugins()
    }
  }

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         plugin.manifest.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && plugin.enabled) ||
                         (filterStatus === 'inactive' && !plugin.enabled)
    return matchesSearch && matchesFilter
  })

  const selectedPluginData = selectedPlugin ? plugins.find(p => p.id === selectedPlugin) : null

  const getStatusColor = (plugin: Plugin) => {
    if (!plugin.enabled) return '#666'
    if (plugin.error) return '#ef4444'
    return '#22c55e'
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#151515',
      color: '#ddd'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #2a2a2a'
      }}>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ddd' }}>Plugin Management</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onOpenMarketplace && (
            <button
              onClick={onOpenMarketplace}
              style={{
                padding: '6px 12px',
                background: '#FF00FF',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={12} />
              Browse Marketplace
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #2a2a2a',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="Search plugins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '6px 12px',
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '4px',
            color: '#ddd',
            fontSize: '11px',
            outline: 'none'
          }}
        />
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['all', 'active', 'inactive'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '6px 12px',
                background: filterStatus === status ? '#FF00FF' : '#1a1a1a',
                color: filterStatus === status ? '#fff' : '#888',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                textTransform: 'capitalize'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Plugin List */}
        <div style={{
          flex: selectedPlugin ? '0 0 300px' : 1,
          overflow: 'auto',
          borderRight: selectedPlugin ? '1px solid #2a2a2a' : 'none'
        }}>
          {filteredPlugins.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: '#666',
              fontSize: '12px'
            }}>
              <Package size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div>No plugins found</div>
              {onOpenMarketplace && (
                <button
                  onClick={onOpenMarketplace}
                  style={{
                    marginTop: '12px',
                    padding: '6px 12px',
                    background: '#FF00FF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Browse Marketplace
                </button>
              )}
            </div>
          ) : (
            filteredPlugins.map(plugin => (
              <div
                key={plugin.id}
                onClick={() => setSelectedPlugin(plugin.id)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #2a2a2a',
                  cursor: 'pointer',
                  background: selectedPlugin === plugin.id ? '#1a1a1a' : 'transparent',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (selectedPlugin !== plugin.id) {
                    e.currentTarget.style.background = '#1a1a1a'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedPlugin !== plugin.id) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '6px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#ddd',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {plugin.manifest.displayName || plugin.manifest.name}
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: getStatusColor(plugin)
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>
                      v{plugin.manifest.version} by {plugin.manifest.author}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.4' }}>
                      {plugin.manifest.description}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Plugin Details */}
        {selectedPluginData && (
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                {selectedPluginData.manifest.displayName || selectedPluginData.manifest.name}
              </h3>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '16px' }}>
                Version {selectedPluginData.manifest.version} • By {selectedPluginData.manifest.author}
              </div>
              
              {/* Status Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: selectedPluginData.enabled ? '#22c55e22' : '#66666622',
                border: `1px solid ${selectedPluginData.enabled ? '#22c55e' : '#666'}`,
                borderRadius: '4px',
                fontSize: '10px',
                color: selectedPluginData.enabled ? '#22c55e' : '#666',
                marginBottom: '16px'
              }}>
                {selectedPluginData.enabled ? (
                  <>
                    <CheckCircle size={12} />
                    Active
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} />
                    Inactive
                  </>
                )}
              </div>

              {selectedPluginData.error && (
                <div style={{
                  padding: '8px 12px',
                  background: '#ef444422',
                  border: '1px solid #ef4444',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '11px',
                  color: '#ef4444'
                }}>
                  <strong>Error:</strong> {selectedPluginData.error}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleTogglePlugin(selectedPluginData.id)}
                  disabled={loading[selectedPluginData.id]}
                  style={{
                    padding: '6px 12px',
                    background: selectedPluginData.enabled ? '#ef4444' : '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading[selectedPluginData.id] ? 'not-allowed' : 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: loading[selectedPluginData.id] ? 0.6 : 1
                  }}
                >
                  {loading[selectedPluginData.id] ? (
                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : selectedPluginData.enabled ? (
                    <PowerOff size={12} />
                  ) : (
                    <Power size={12} />
                  )}
                  {selectedPluginData.enabled ? 'Deactivate' : 'Activate'}
                </button>

                <button
                  onClick={() => handleHotReload(selectedPluginData.id)}
                  disabled={loading[selectedPluginData.id] || !selectedPluginData.enabled}
                  style={{
                    padding: '6px 12px',
                    background: '#1a1a1a',
                    color: '#ddd',
                    border: '1px solid #2a2a2a',
                    borderRadius: '4px',
                    cursor: loading[selectedPluginData.id] || !selectedPluginData.enabled ? 'not-allowed' : 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: loading[selectedPluginData.id] || !selectedPluginData.enabled ? 0.4 : 1
                  }}
                >
                  <RefreshCw size={12} />
                  Hot Reload
                </button>

                <button
                  onClick={() => handleUninstallPlugin(selectedPluginData.id)}
                  disabled={loading[selectedPluginData.id]}
                  style={{
                    padding: '6px 12px',
                    background: '#1a1a1a',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    cursor: loading[selectedPluginData.id] ? 'not-allowed' : 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: loading[selectedPluginData.id] ? 0.6 : 1
                  }}
                >
                  <Trash2 size={12} />
                  Uninstall
                </button>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#ddd' }}>
                Description
              </h4>
              <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.6' }}>
                {selectedPluginData.manifest.description}
              </div>
            </div>

            {/* Details */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px', color: '#ddd' }}>
                Details
              </h4>
              <div style={{ fontSize: '11px', color: '#999', lineHeight: '2' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: '#666' }}>ID:</span>
                  <span>{selectedPluginData.manifest.id}</span>
                  
                  <span style={{ color: '#666' }}>Version:</span>
                  <span>{selectedPluginData.manifest.version}</span>
                  
                  <span style={{ color: '#666' }}>Author:</span>
                  <span>{selectedPluginData.manifest.author}</span>
                  
                  {selectedPluginData.manifest.license && (
                    <>
                      <span style={{ color: '#666' }}>License:</span>
                      <span>{selectedPluginData.manifest.license}</span>
                    </>
                  )}
                  
                  <span style={{ color: '#666' }}>Bloop Engine:</span>
                  <span>{selectedPluginData.manifest.engines.bloop}</span>
                  
                  {selectedPluginData.manifest.categories.length > 0 && (
                    <>
                      <span style={{ color: '#666' }}>Categories:</span>
                      <span>{selectedPluginData.manifest.categories.join(', ')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Permissions */}
            {selectedPluginData.manifest.permissions && selectedPluginData.manifest.permissions.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px', color: '#ddd', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={14} />
                  Permissions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedPluginData.manifest.permissions.map((permission, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '4px',
                        fontSize: '10px'
                      }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: '4px', color: '#ddd' }}>
                        {permission.name}
                      </div>
                      <div style={{ color: '#666' }}>
                        {permission.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contributions */}
            {selectedPluginData.manifest.contributes && (
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px', color: '#ddd' }}>
                  Contributions
                </h4>
                
                {selectedPluginData.manifest.contributes.commands && selectedPluginData.manifest.contributes.commands.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                      Commands ({selectedPluginData.manifest.contributes.commands.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedPluginData.manifest.contributes.commands.map((cmd, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '6px 12px',
                            background: '#1a1a1a',
                            borderRadius: '4px',
                            fontSize: '10px',
                            color: '#999'
                          }}
                        >
                          <code style={{ color: '#FF00FF' }}>{cmd.command}</code>
                          {' • '}
                          <span>{cmd.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPluginData.manifest.contributes.languages && selectedPluginData.manifest.contributes.languages.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                      Languages ({selectedPluginData.manifest.contributes.languages.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedPluginData.manifest.contributes.languages.map((lang, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '4px 10px',
                            background: '#1a1a1a',
                            border: '1px solid #2a2a2a',
                            borderRadius: '4px',
                            fontSize: '10px',
                            color: '#999'
                          }}
                        >
                          {lang.aliases?.[0] || lang.id}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
