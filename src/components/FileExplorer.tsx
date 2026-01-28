import { ChevronDown, ChevronRight, Search, GitBranch, Settings, FileText, Folder, FolderOpen } from 'lucide-react'
import { useState } from 'react'

export function FileExplorer() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'Bloop UI': true,
  })

  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const files = [
    { name: 'node_modules', type: 'folder', expanded: false },
    { name: 'src', type: 'folder', expanded: false },
    { name: '.gitignore', type: 'file' },
    { name: 'index.html', type: 'file' },
    { name: 'package-lock.json', type: 'file' },
    { name: 'package.json', type: 'file' },
    { name: 'postcss.config.js', type: 'file' },
    { name: 'README.md', type: 'file' },
    { name: 'tailwind.config.js', type: 'file' },
    { name: 'tsconfig.json', type: 'file' },
    { name: 'tsconfig.node.json', type: 'file' },
    { name: 'vite.config.ts', type: 'file' },
  ]

  return (
    <div 
      className="w-64 flex flex-col h-full border-r"
      style={{ 
        backgroundColor: '#252526',
        borderColor: '#3e3e42'
      }}
    >
      {/* Header */}
      <div 
        className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: '#3e3e42' }}
      >
        <div className="flex items-center gap-1.5">
          <button onClick={() => toggle('Bloop UI')}>
            {expanded['Bloop UI'] ? (
              <ChevronDown className="w-4 h-4" style={{ color: '#858585' }} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{ color: '#858585' }} />
            )}
          </button>
          <span className="text-sm font-medium" style={{ color: '#cccccc' }}>Bloop UI</span>
        </div>
        <Search className="w-4 h-4 cursor-pointer" style={{ color: '#858585' }} />
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2 text-sm">
        {files.map((file, idx) => (
          <div key={idx} className="flex items-center gap-1.5 py-0.5 px-1 hover:bg-panel-hover rounded cursor-pointer group">
            {file.type === 'folder' ? (
              <>
                {file.expanded ? (
                  <FolderOpen className="w-4 h-4 text-muted-light" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-muted" />
                )}
                <Folder className="w-4 h-4 text-muted-light" />
              </>
            ) : (
              <FileText className="w-4 h-4 text-muted ml-5" />
            )}
            <span className="text-muted-light text-xs">{file.name}</span>
          </div>
        ))}
      </div>

      {/* Bottom Navigation Icons */}
      <div className="border-t border-border p-2">
        <div className="flex flex-col gap-2">
          <Search className="w-4 h-4 text-muted hover:text-text cursor-pointer" />
          <GitBranch className="w-4 h-4 text-muted hover:text-text cursor-pointer" />
          <Settings className="w-4 h-4 text-muted hover:text-text cursor-pointer" />
        </div>
      </div>

      {/* Collapsed Sections */}
      <div className="border-t border-border p-2 space-y-1">
        <div className="text-xs text-muted uppercase">OUTLINE</div>
        <div className="text-xs text-muted uppercase">TIMELINE</div>
      </div>

      {/* Bottom Status */}
      <div className="border-t border-border px-3 py-1.5 text-xs text-muted">
        Bloop UI <span className="text-muted">0 0</span>
      </div>
    </div>
  )
}
