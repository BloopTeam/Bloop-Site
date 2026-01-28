import { useEffect, useCallback } from 'react'

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  callback: () => void
  preventDefault?: boolean
}

/**
 * Custom hook for managing keyboard shortcuts across the application
 * Provides a clean interface for registering complex key combinations
 * with modifier keys and automatic cleanup
 */
export function useKeyboardShortcut(config: ShortcutConfig | ShortcutConfig[]) {
  const configs = Array.isArray(config) ? config : [config]

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    configs.forEach(({ key, ctrl, shift, alt, meta, callback, preventDefault = true }) => {
      const ctrlMatch = ctrl === undefined || event.ctrlKey === ctrl
      const shiftMatch = shift === undefined || event.shiftKey === shift
      const altMatch = alt === undefined || event.altKey === alt
      const metaMatch = meta === undefined || event.metaKey === meta
      const keyMatch = event.key.toLowerCase() === key.toLowerCase()

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        if (preventDefault) {
          event.preventDefault()
        }
        callback()
      }
    })
  }, [configs])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])
}

/**
 * Hook for managing keyboard navigation in lists
 * Handles arrow keys, home, end, page up/down navigation
 */
export function useListNavigation(
  itemCount: number,
  onSelect: (index: number) => void,
  initialIndex = 0
) {
  const handleNavigation = useCallback((event: KeyboardEvent) => {
    const currentIndex = initialIndex

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        onSelect(Math.max(0, currentIndex - 1))
        break
      case 'ArrowDown':
        event.preventDefault()
        onSelect(Math.min(itemCount - 1, currentIndex + 1))
        break
      case 'Home':
        event.preventDefault()
        onSelect(0)
        break
      case 'End':
        event.preventDefault()
        onSelect(itemCount - 1)
        break
      case 'PageUp':
        event.preventDefault()
        onSelect(Math.max(0, currentIndex - 10))
        break
      case 'PageDown':
        event.preventDefault()
        onSelect(Math.min(itemCount - 1, currentIndex + 10))
        break
    }
  }, [itemCount, onSelect, initialIndex])

  useEffect(() => {
    window.addEventListener('keydown', handleNavigation)
    return () => window.removeEventListener('keydown', handleNavigation)
  }, [handleNavigation])
}
