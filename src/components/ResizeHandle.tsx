import { useState, useRef, useEffect } from 'react'

interface ResizeHandleProps {
  onResize: (delta: number) => void
  direction: 'horizontal' | 'vertical'
  style?: React.CSSProperties
}

export default function ResizeHandle({ onResize, direction, style }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const startPos = useRef(0)

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY
      const delta = currentPos - startPos.current
      
      if (Math.abs(delta) > 0) {
        onResize(delta)
        startPos.current = currentPos
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, onResize, direction])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'relative',
        backgroundColor: isDragging ? '#007acc' : 'transparent',
        cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
        ...(direction === 'horizontal' ? {
          width: '4px',
          minWidth: '4px',
          marginLeft: '-2px',
          marginRight: '-2px',
        } : {
          height: '4px',
          minHeight: '4px',
          marginTop: '-2px',
          marginBottom: '-2px',
        }),
        zIndex: 10,
        transition: 'background-color 0.15s',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = '#3e3e42'
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
    />
  )
}
