'use client'
import { useState, useEffect, useRef } from 'react'
import type { NormalizedCostData, FilterState } from '@/lib/providers/types'

export function useCostData(providerId: string, apiKey: string | null, filters: FilterState) {
  const [data, setData] = useState<NormalizedCostData | null>(null)
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

    const params = new URLSearchParams({ provider: providerId })
    if (filters.start) params.set('start', filters.start)
    if (filters.end) params.set('end', filters.end)
    params.set('granularity', filters.granularity)
    filters.groupBy.forEach((d) => params.append('groupBy', d))

    fetch(`/api/costs?${params}`, {
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
  }, [providerId, apiKey, filters.start, filters.end, filters.granularity, filters.groupBy.join(',')])

  useEffect(() => {
    if (!apiKey) return
    const id = setInterval(() => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const params = new URLSearchParams({ provider: providerId })
      if (filters.start) params.set('start', filters.start)
      if (filters.end) params.set('end', filters.end)
      params.set('granularity', filters.granularity)
      filters.groupBy.forEach((d) => params.append('groupBy', d))
      fetch(`/api/costs?${params}`, { headers: { 'x-api-key': apiKey }, signal: ctrl.signal })
        .then((r) => r.json())
        .then((json) => { if (!json.error) setData(json) })
        .catch(() => null)
    }, 60_000)
    return () => clearInterval(id)
  }, [providerId, apiKey, filters.start, filters.end, filters.granularity, filters.groupBy.join(',')])

  return { data, isLoading, error }
}
