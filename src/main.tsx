import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Security: Disable React DevTools in production
if (import.meta.env.PROD) {
  const noop = (): void => undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any
  const DEV_TOOLS = win.__REACT_DEVTOOLS_GLOBAL_HOOK__
  
  if (typeof DEV_TOOLS === 'object' && DEV_TOOLS !== null) {
    const hooks = DEV_TOOLS as Record<string, unknown>
    for (const key in hooks) {
      if (typeof hooks[key] === 'function') {
        hooks[key] = noop
      }
    }
  }
}

// Security: Prevent console access in production
if (import.meta.env.PROD) {
  const originalConsole = { ...console }
  
  // Keep error logging for debugging
  console.log = () => {}
  console.info = () => {}
  console.debug = () => {}
  console.warn = originalConsole.warn
  console.error = originalConsole.error
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found. Ensure index.html contains <div id="root"></div>')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
