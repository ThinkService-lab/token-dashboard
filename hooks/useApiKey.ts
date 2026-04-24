'use client'
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY_PREFIX = 'token_dashboard_apikey_'

export function useApiKey(providerId: string) {
  const key = STORAGE_KEY_PREFIX + providerId
  const [apiKey, setApiKeyState] = useState<string | null>(null)

  useEffect(() => {
    setApiKeyState(localStorage.getItem(key))
  }, [key])

  const setApiKey = useCallback(
    (value: string | null) => {
      if (value) {
        localStorage.setItem(key, value)
      } else {
        localStorage.removeItem(key)
      }
      setApiKeyState(value)
    },
    [key]
  )

  return { apiKey, setApiKey }
}

export function getAllApiKeys(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const result: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(STORAGE_KEY_PREFIX)) {
      const providerId = k.replace(STORAGE_KEY_PREFIX, '')
      result[providerId] = localStorage.getItem(k) ?? ''
    }
  }
  return result
}
