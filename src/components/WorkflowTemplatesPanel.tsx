/**
 * Workflow Templates Panel
 * Create, manage, and execute reusable workflow templates
 */

import { useState, useEffect } from 'react'
import { 
  X, Plus, Play, Edit, Trash2, Copy, Save, Search,
  Zap, Clock, GitBranch, AlertTriangle, CheckCircle, Loader2
} from 'lucide-react'
import { 
  workflowTemplatesService, 
  WorkflowTemplate, 
  WorkflowExecution,
  WorkflowStep 
} from '../services/workflowTemplates'

interface WorkflowTemplatesPanelProps {
  onClose: () => void
}

type ViewMode = 'list' | 'create' | 'edit' | 'execute'

export default function WorkflowTemplatesPanel({ onClose }: WorkflowTemplatesPanelProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [executing, setExecuting] = useState<Record<string, boolean>>({})

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'development' as WorkflowTemplate['category'],
    steps: [] as Omit<WorkflowStep, 'id'>[]
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    const templates = await workflowTemplatesService.getAllTemplates()
    setTemplates(templates)
  }

  const handleCreateTemplate = async () => {
    try {
      await workflowTemplatesService.createTemplate({
        name: formData.name,
        description: formData.description,
        version: '1.0.0',
        author: {
          id: 'current-user',
          name: 'Current User'
        },
        category: formData.category,
        tags: [],
        visibility: 'private',
        workflow: {
          name: formData.name,
          description: formData.description,
          steps: formData.steps.map((step, idx) => ({
            id: `step-${idx}`,
            name: step.name,
            type: step.action.type,
            action: step.action,
            description: step.description
          })),
          triggers: []
        },
        variables: [],
        dependencies: [],
        difficulty: 'beginner',
        verified: false,
        featured: false,
        license: 'MIT',
        metadata: {}
      })
      setViewMode('list')
      setFormData({ name: '', description: '', category: 'development', steps: [] })
      loadTemplates()
    } catch (error) {
      console.error('Failed to create template:', error)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    try {
      await workflowTemplatesService.deleteTemplate(templateId)
      loadTemplates()
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null)
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const handleExecuteTemplate = async (templateId: string) => {
    setExecuting({ ...executing, [templateId]: true })
    
    try {
      const execution = await workflowTemplatesService.executeTemplate(
        templateId,
        {},
        { userId: 'current-user', userName: 'Current User', trigger: 'manual' }
      )
      setExecutions([execution, ...executions])
    } catch (error) {
      console.error('Failed to execute template:', error)
    } finally {
      setExecuting({ ...executing, [templateId]: false })
    }
  }

  const handleDuplicateTemplate = async (template: WorkflowTemplate) => {
    try {
      await workflowTemplatesService.createTemplate({
        name: `${template.name} (Copy)`,
        description: template.description,
        version: '1.0.0',
        author: {
          id: 'current-user',
          name: 'Current User'
        },
        category: template.category,
        tags: template.tags,
        visibility: 'private',
        workflow: {
          name: `${template.name} (Copy)`,
          description: template.description,
          steps: template.workflow.steps,
          triggers: template.workflow.triggers
        },
        variables: template.variables,
        dependencies: template.dependencies,
        difficulty: template.difficulty,
        verified: false,
        featured: false,
        license: template.license,
        metadata: template.metadata
      })
      loadTemplates()
    } catch (error) {
      console.error('Failed to duplicate template:', error)
    }
  }

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          name: 'New Step',
          type: 'command' as const,
          description: '',
          action: {
            type: 'command' as const,
            config: {},
            command: ''
          },
          continueOnError: false
        }
      ]
    })
  }

  const updateStep = (index: number, updates: Partial<Omit<WorkflowStep, 'id'>>) => {
    const newSteps = [...formData.steps]
    newSteps[index] = { ...newSteps[index], ...updates }
    setFormData({ ...formData, steps: newSteps })
  }

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index)
    })
  }

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e'
      case 'failed': return '#ef4444'
      case 'running': return '#f59e0b'
      default: return '#666'
    }
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
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ddd' }}>Workflow Templates</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {viewMode === 'list' && (
            <button
              onClick={() => setViewMode('create')}
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
              <Plus size={12} />
              Create Template
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

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Search */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 12px 6px 32px',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  color: '#ddd',
                  fontSize: '11px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Templates List */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filteredTemplates.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                <Zap size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div>No workflow templates found</div>
                <button
                  onClick={() => setViewMode('create')}
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
                  Create Your First Template
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', padding: '16px' }}>
                {filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    style={{
                      padding: '16px',
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#ddd', marginBottom: '4px' }}>
                        {template.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
                        {template.category} • {template.workflow.steps.length} steps
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.5' }}>
                        {template.description}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {template.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          style={{
                            padding: '2px 8px',
                            background: '#2a2a2a',
                            borderRadius: '4px',
                            fontSize: '9px',
                            color: '#888'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#666' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span>{template.usageCount} uses</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleExecuteTemplate(template.id)
                          }}
                          disabled={executing[template.id]}
                          style={{
                            padding: '4px 8px',
                            background: '#FF00FF',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: executing[template.id] ? 'not-allowed' : 'pointer',
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {executing[template.id] ? (
                            <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Play size={10} />
                          )}
                          Run
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicateTemplate(template)
                          }}
                          style={{
                            padding: '4px',
                            background: '#1a1a1a',
                            color: '#888',
                            border: '1px solid #2a2a2a',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTemplate(template.id)
                          }}
                          style={{
                            padding: '4px',
                            background: '#1a1a1a',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create/Edit View */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
              {viewMode === 'create' ? 'Create New Template' : 'Edit Template'}
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Template name..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  color: '#ddd',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this workflow does..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  color: '#ddd',
                  fontSize: '11px',
                  outline: 'none',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  color: '#ddd',
                  fontSize: '11px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="development">Development</option>
                <option value="testing">Testing</option>
                <option value="deployment">Deployment</option>
                <option value="documentation">Documentation</option>
                <option value="security">Security</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', color: '#888' }}>
                  Steps ({formData.steps.length})
                </label>
                <button
                  onClick={addStep}
                  style={{
                    padding: '4px 10px',
                    background: '#FF00FF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={10} />
                  Add Step
                </button>
              </div>

              {formData.steps.length === 0 ? (
                <div style={{ padding: '24px', background: '#1a1a1a', borderRadius: '6px', textAlign: 'center', color: '#666', fontSize: '11px' }}>
                  No steps yet. Add your first step to get started.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {formData.steps.map((step, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#888' }}>Step {index + 1}</div>
                        <button
                          onClick={() => removeStep(index)}
                          style={{
                            padding: '2px',
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStep(index, { name: e.target.value })}
                        placeholder="Step name..."
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: '#252526',
                          border: '1px solid #2a2a2a',
                          borderRadius: '4px',
                          color: '#ddd',
                          fontSize: '11px',
                          outline: 'none',
                          marginBottom: '8px'
                        }}
                      />

                      <textarea
                        value={step.description}
                        onChange={(e) => updateStep(index, { description: e.target.value })}
                        placeholder="Step description..."
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: '#252526',
                          border: '1px solid #2a2a2a',
                          borderRadius: '4px',
                          color: '#ddd',
                          fontSize: '10px',
                          outline: 'none',
                          minHeight: '50px',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          marginBottom: '8px'
                        }}
                      />

                      <select
                        value={step.action.type}
                        onChange={(e) => updateStep(index, { 
                          action: { ...step.action, type: e.target.value as any }
                        })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: '#252526',
                          border: '1px solid #2a2a2a',
                          borderRadius: '4px',
                          color: '#ddd',
                          fontSize: '10px',
                          cursor: 'pointer',
                          outline: 'none',
                          marginBottom: '8px'
                        }}
                      >
                        <option value="command">Command</option>
                        <option value="http-request">HTTP Request</option>
                        <option value="file-operation">File Operation</option>
                        <option value="agent-task">Agent Task</option>
                        <option value="code-generation">Code Generation</option>
                      </select>

                      {step.action.type === 'command' && (
                        <input
                          type="text"
                          value={step.action.command || ''}
                          onChange={(e) => updateStep(index, { 
                            action: { ...step.action, command: e.target.value }
                          })}
                          placeholder="Command to execute..."
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            background: '#252526',
                            border: '1px solid #2a2a2a',
                            borderRadius: '4px',
                            color: '#ddd',
                            fontSize: '10px',
                            outline: 'none',
                            fontFamily: 'monospace'
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCreateTemplate}
                disabled={!formData.name || formData.steps.length === 0}
                style={{
                  padding: '8px 16px',
                  background: (!formData.name || formData.steps.length === 0) ? '#666' : '#FF00FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (!formData.name || formData.steps.length === 0) ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Save size={12} />
                {viewMode === 'create' ? 'Create Template' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setViewMode('list')
                  setFormData({ name: '', description: '', category: 'development', steps: [] })
                }}
                style={{
                  padding: '8px 16px',
                  background: '#1a1a1a',
                  color: '#ddd',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Details Modal */}
      {selectedTemplate && viewMode === 'list' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedTemplate(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '600px',
              maxHeight: '80vh',
              background: '#151515',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #2a2a2a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                  {selectedTemplate.name}
                </h3>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  {selectedTemplate.category} • {selectedTemplate.workflow.steps.length} steps
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#ddd', lineHeight: '1.6', marginBottom: '24px' }}>
                {selectedTemplate.description}
              </div>

              <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px', color: '#ddd' }}>
                Steps
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {selectedTemplate.workflow.steps.map((step, index) => (
                  <div
                    key={step.id}
                    style={{
                      padding: '12px',
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                      Step {index + 1}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#ddd', marginBottom: '4px' }}>
                      {step.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#999' }}>
                      {step.description}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '6px' }}>
                      Action: {step.action.type}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleExecuteTemplate(selectedTemplate.id)}
                  disabled={executing[selectedTemplate.id]}
                  style={{
                    padding: '8px 16px',
                    background: '#FF00FF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: executing[selectedTemplate.id] ? 'not-allowed' : 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {executing[selectedTemplate.id] ? (
                    <>
                      <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play size={12} />
                      Execute
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDuplicateTemplate(selectedTemplate)}
                  style={{
                    padding: '8px 16px',
                    background: '#1a1a1a',
                    color: '#ddd',
                    border: '1px solid #2a2a2a',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Copy size={12} />
                  Duplicate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
