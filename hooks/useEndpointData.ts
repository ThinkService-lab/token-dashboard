'use client'
import { useEffect, useReducer, useRef } from 'react'
import type { FilterState } from '@/lib/providers/types'

type EndpointState<T> = {
  data: T | null
  isLoading: boolean
  error: string | null
}

type EndpointAction<T> =
  | { type: 'loading' }
  | { type: 'success'; data: T }
  | { type: 'error'; error: string }

function endpointReducer<T>(state: EndpointState<T>, action: EndpointAction<T>): EndpointState<T> {
  switch (action.type) {
    case 'loading':
      return { ...state, isLoading: true, error: null }
    case 'success':
      return { data: action.data, isLoading: false, error: null }
    case 'error':
      return { ...state, isLoading: false, error: action.error }
  }
}

function buildEndpointParams(
  providerId: string,
  start: string | undefined,
  end: string | undefined,
  granularity: string,
  groupBy: string[]
) {
  const params = new URLSearchParams({ provider: providerId })
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  params.set('granularity', granularity)
  groupBy.forEach((dimension) => params.append('groupBy', dimension))
  return params
}

export function useEndpointData<T>(
  endpoint: string,
  providerId: string,
  filters: FilterState,
  enabled = true
) {
  const [state, dispatch] = useReducer(endpointReducer<T>, {
    data: null,
    isLoading: false,
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)
  const { start, end, granularity } = filters
  const groupByKey = filters.groupBy.join(',')

  useEffect(() => {
    if (!enabled) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    dispatch({ type: 'loading' })

    const params = buildEndpointParams(providerId, start, end, granularity, groupByKey ? groupByKey.split(',') : [])
    fetch(`/api/${endpoint}?${params}`, {
      signal: ctrl.signal,
    })
      .then(async (response) => {
        const json = await response.json()
        if (!response.ok) {
          throw new Error(json.error ?? `Request failed with ${response.status}`)
        }
        return json
      })
      .then((json) => {
        if (json.error) {
          dispatch({ type: 'error', error: json.error })
        } else {
          dispatch({ type: 'success', data: json })
        }
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') {
          dispatch({ type: 'error', error: error.message })
        }
      })

    return () => ctrl.abort()
  }, [endpoint, providerId, start, end, granularity, groupByKey, enabled])

  useEffect(() => {
    if (!enabled) return

    const id = setInterval(() => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const params = buildEndpointParams(providerId, start, end, granularity, groupByKey ? groupByKey.split(',') : [])
      fetch(`/api/${endpoint}?${params}`, {
        signal: ctrl.signal,
      })
        .then(async (response) => {
          const json = await response.json()
          if (!response.ok) {
            throw new Error(json.error ?? `Request failed with ${response.status}`)
          }
          return json
        })
        .then((json) => {
          if (!json.error) {
            dispatch({ type: 'success', data: json })
          }
        })
        .catch(() => null)
    }, 60_000)

    return () => clearInterval(id)
  }, [endpoint, providerId, start, end, granularity, groupByKey, enabled])

  return state
}
