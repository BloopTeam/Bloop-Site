import { ReactNode, useState } from 'react'

interface TooltipProps {
  children: ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: 'absolute',
            [position]: '100%',
            left: position === 'left' || position === 'right' ? '50%' : '50%',
            transform: 'translateX(-50%)',
            marginTop: position === 'bottom' ? '8px' : position === 'top' ? '-8px' : 0,
            marginLeft: position === 'left' ? '-8px' : position === 'right' ? '8px' : 0,
            backgroundColor: '#1e1e1e',
            color: '#cccccc',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            border: '1px solid #3e3e42',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
