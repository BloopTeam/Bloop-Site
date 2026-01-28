import { X, ChevronDown, ChevronRight } from 'lucide-react'
import { GitDiff } from '../utils/gitUtils'

interface DiffViewerProps {
  diff: GitDiff
  onClose: () => void
}

export default function DiffViewer({ diff, onClose }: DiffViewerProps) {
  const getLineStyle = (type: string) => {
    switch (type) {
      case 'added':
        return { background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderLeft: '2px solid #22c55e' }
      case 'removed':
        return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderLeft: '2px solid #ef4444' }
      case 'modified':
        return { background: 'rgba(255, 165, 0, 0.1)', color: '#FFA500', borderLeft: '2px solid #FFA500' }
      default:
        return { background: 'transparent', color: '#cccccc' }
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px'
    }}>
      <div style={{
        width: '90%',
        maxWidth: '1200px',
        height: '90%',
        background: '#0a0a0a',
        border: '1px solid #3e3e42',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #3e3e42',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#141414'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 600, color: '#cccccc' }}>{diff.file}</span>
            <span style={{ fontSize: '12px', color: '#858585' }}>
              +{diff.additions} -{diff.deletions}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#858585',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Diff Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          fontFamily: '"Fira Code", monospace',
          fontSize: '13px',
          lineHeight: '1.6'
        }}>
          <div style={{ display: 'flex' }}>
            {/* Line Numbers (Old) */}
            <div style={{
              padding: '16px 8px',
              background: '#0a0a0a',
              borderRight: '1px solid #1a1a1a',
              textAlign: 'right',
              color: '#666',
              userSelect: 'none',
              minWidth: '80px'
            }}>
              {diff.changes.map((change, idx) => (
                <div key={idx} style={{ height: '1.6em' }}>
                  {change.oldLineNumber || ''}
                </div>
              ))}
            </div>

            {/* Line Numbers (New) */}
            <div style={{
              padding: '16px 8px',
              background: '#0a0a0a',
              borderRight: '1px solid #1a1a1a',
              textAlign: 'right',
              color: '#666',
              userSelect: 'none',
              minWidth: '80px'
            }}>
              {diff.changes.map((change, idx) => (
                <div key={idx} style={{ height: '1.6em' }}>
                  {change.newLineNumber || ''}
                </div>
              ))}
            </div>

            {/* Code Content */}
            <div style={{ flex: 1, padding: '16px' }}>
              {diff.changes.map((change, idx) => (
                <div
                  key={idx}
                  style={{
                    ...getLineStyle(change.type),
                    padding: '0 12px',
                    height: '1.6em',
                    display: 'flex',
                    alignItems: 'center',
                    whiteSpace: 'pre'
                  }}
                >
                  {change.type === 'added' && <span style={{ marginRight: '8px' }}>+</span>}
                  {change.type === 'removed' && <span style={{ marginRight: '8px' }}>-</span>}
                  {change.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
