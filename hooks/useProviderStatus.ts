'use client'
import { useEffect, useState } from 'react'

export interface ProviderStatus {
  id: string
  label: string
  color: string
  envVar: string | null
  configured: boolean
}

interface ProviderStatusState {
  providers: ProviderStatus[]
  isLoading: boolean
  error: string | null
}

export function useProviderStatus() {
  const [state, setState] = useState<ProviderStatusState>({
    providers: [],
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    const ctrl = new AbortController()

    async function loadProviderStatus() {
      try {
        const response = await fetch('/api/provider-status', {
          signal: ctrl.signal,
          cache: 'no-store',
        })
        const json = await response.json()

        if (!response.ok) {
          throw new Error(json.error ?? 'Failed to load provider status')
        }

        setState({
          providers: Array.isArray(json.providers) ? json.providers : [],
          isLoading: false,
          error: null,
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setState({
            providers: [],
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load provider status',
          })
        }
      }
    }

    void loadProviderStatus()

    return () => ctrl.abort()
  }, [])

  return state
}
