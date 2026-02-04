import { useState, useEffect, useCallback } from 'react'

/**
 * Advanced local storage hook with automatic JSON serialization,
 * error handling, cross-tab synchronization, and user-specific scoping
 * 
 * For multi-user support, all keys are automatically scoped to the current user
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: {
    serialize?: (value: T) => string
    deserialize?: (value: string) => T
    syncAcrossTabs?: boolean
    userSpecific?: boolean // If true, key is scoped to current user (default: true)
  } = {}
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    syncAcrossTabs = true,
    userSpecific = true // Default to user-specific for multi-user support
  } = options

  // Get user-scoped key (lazy import to avoid circular dependencies)
  const getStorageKey = useCallback(() => {
    if (!userSpecific) return key
    try {
      // Dynamic import to avoid circular dependency issues
      const { userSessionService } = require('../services/userSession')
      if (userSessionService && typeof userSessionService.getUserStorageKey === 'function') {
        return userSessionService.getUserStorageKey(key)
      }
    } catch (error) {
      // Fallback if service not available yet
      console.warn('userSessionService not available, using default key:', error)
    }
    return key
  }, [key, userSpecific])

  // Get storage key - compute once, use throughout
  const storageKey = getStorageKey()

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(storageKey)
      return item ? deserialize(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${storageKey}":`, error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      
      setStoredValue(valueToStore)
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, serialize(valueToStore))
        
        // Dispatch custom event for cross-tab communication
        window.dispatchEvent(
          new CustomEvent('local-storage-change', {
            detail: { key: storageKey, value: valueToStore }
          })
        )
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${storageKey}":`, error)
    }
  }, [storageKey, storedValue, serialize])

  // Remove item from localStorage
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey)
      setStoredValue(initialValue)
    } catch (error) {
      console.warn(`Error removing localStorage key "${storageKey}":`, error)
    }
  }, [storageKey, initialValue])

  // Listen for changes in other tabs/windows
  useEffect(() => {
    if (!syncAcrossTabs) return

    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if ('key' in e && e.key === storageKey && e.newValue) {
        try {
          setStoredValue(deserialize(e.newValue))
        } catch (error) {
          console.warn(`Error syncing localStorage key "${storageKey}":`, error)
        }
      } else if ('detail' in e && e.detail.key === storageKey) {
        setStoredValue(e.detail.value)
      }
    }

    window.addEventListener('storage', handleStorageChange as EventListener)
    window.addEventListener('local-storage-change', handleStorageChange as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange as EventListener)
      window.removeEventListener('local-storage-change', handleStorageChange as EventListener)
    }
  }, [storageKey, deserialize, syncAcrossTabs])

  return [storedValue, setValue, removeValue]
}

/**
 * Hook for managing session storage with similar API to useLocalStorage
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.sessionStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  const removeValue = useCallback(() => {
    try {
      window.sessionStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.warn(`Error removing sessionStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}
