import { Mic, AtSign, MessageSquare } from 'lucide-react'

export function RightSidebar() {
  const fileChanges = [
    { name: 'packa...', type: 'json', changes: '+33 -1' },
    { name: 'tsconf...', type: 'json', changes: '+26 -1' },
    { name: 'tsconf...', type: 'json', changes: '+11 -1' },
    { name: 'vite.c...', type: 'ts', changes: '+12 -1' },
    { name: 'JS tailwi...', type: 'js', changes: '+25 -1' },
    { name: 'JS postcs...', type: 'js', changes: '+7 -1' },
    { name: '<> index....', type: 'html', changes: '+17 -1' },
    { name: 'main.t...', type: 'ts', changes: '+11 -1' },
    { name: '# index.css', type: 'css', changes: '+22 -1' },
    { name: 'App.tsx', type: 'tsx', changes: '+22 -1' },
    { name: 'TS vite-en...', type: 'ts', changes: '+2 -1' },
    { name: '◆ .gitig...', type: 'git', changes: '+25 -1' },
  ]

  return (
    <div 
      className="w-80 flex flex-col border-l"
      style={{ 
        backgroundColor: '#252526',
        borderColor: '#3e3e42'
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: '#3e3e42' }}>
        <div className="text-sm font-medium mb-2" style={{ color: '#cccccc' }}>BloopCode initial +</div>
        <div className="text-xs leading-relaxed" style={{ color: '#858585' }}>
          Below is a fully working starter layout that visually matches the image you posted.
        </div>
        <div className="text-xs mt-2" style={{ color: '#858585' }}>
          BottomBar components: Complex state management, Unnecessary features.
        </div>
        <div className="text-xs mt-2" style={{ color: '#858585' }}>
          The UI now matches the starter layout. You can add: Monaco Editor or CodeMirror, MCP execution panel, Claude-style right sidebar, Terminal drawer, Command palette, File search.
        </div>
        <div className="text-xs mt-2" style={{ color: '#858585' }}>
          Run npm run dev to see the new layout.
        </div>
      </div>

      {/* Files Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium" style={{ color: '#cccccc' }}>19 Files</div>
          <div className="flex gap-2">
            <button className="text-xs px-2 py-1" style={{ color: '#858585' }}>Undo All</button>
            <button className="text-xs px-2 py-1" style={{ color: '#858585' }}>Keep All</button>
          </div>
        </div>

        <div className="space-y-1">
          {fileChanges.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer group hover:bg-gray-700"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#858585' }}></div>
                <span className="text-xs" style={{ color: '#a0a0a0' }}>{file.name}</span>
              </div>
              <span className="text-xs" style={{ color: '#858585' }}>{file.changes}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Commands Input */}
      <div className="border-t p-3" style={{ borderColor: '#3e3e42' }}>
        <div 
          className="flex items-center gap-2 rounded px-3 py-2 border"
          style={{ 
            backgroundColor: '#1e1e1e',
            borderColor: '#3e3e42'
          }}
        >
          <Mic className="w-4 h-4" style={{ color: '#858585' }} />
          <input
            type="text"
            placeholder="commands"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: '#cccccc' }}
          />
          <div className="flex items-center gap-1">
            <AtSign className="w-4 h-4" style={{ color: '#858585' }} />
            <MessageSquare className="w-4 h-4" style={{ color: '#858585' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
