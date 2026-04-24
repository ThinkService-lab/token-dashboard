'use client'
import { useState, useEffect, useRef } from 'react'
import type { ClaudeCodeData, FilterState } from '@/lib/providers/types'

export function useClaudeCodeData(apiKey: string | null, filters: FilterState) {
  const [data, setData] = useState<ClaudeCodeData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!apiKey) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({ provider: 'anthropic' })
    if (filters.start) params.set('start', filters.start)
    if (filters.end) params.set('end', filters.end)
    params.set('granularity', filters.granularity)

    fetch(`/api/claude-code?${params}`, {
      headers: { 'x-api-key': apiKey },
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error)
        else setData(json)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
      .finally(() => setIsLoading(false))
  }, [apiKey, filters.start, filters.end, filters.granularity])

  return { data, isLoading, error }
}
