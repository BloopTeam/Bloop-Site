import { ReactNode } from 'react'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#1e1e1e', color: '#cccccc' }}>
      {children}
    </div>
  );
}
