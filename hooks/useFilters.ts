'use client'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { FilterState, Granularity, GroupByDimension } from '@/lib/providers/types'
import { DEFAULT_GRANULARITY } from '@/lib/constants'

export function useFilters(): [FilterState, (update: Partial<FilterState>) => void] {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const filters: FilterState = {
    start: searchParams.get('start') ?? undefined,
    end: searchParams.get('end') ?? undefined,
    granularity: (searchParams.get('granularity') as Granularity) ?? DEFAULT_GRANULARITY,
    groupBy: (searchParams.getAll('groupBy') as GroupByDimension[]),
  }

  const setFilters = useCallback(
    (update: Partial<FilterState>) => {
      const params = new URLSearchParams(searchParams.toString())
      if ('start' in update) {
        update.start ? params.set('start', update.start) : params.delete('start')
      }
      if ('end' in update) {
        update.end ? params.set('end', update.end) : params.delete('end')
      }
      if ('granularity' in update && update.granularity) {
        params.set('granularity', update.granularity)
      }
      if ('groupBy' in update && update.groupBy !== undefined) {
        params.delete('groupBy')
        update.groupBy.forEach((d) => params.append('groupBy', d))
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname]
  )

  return [filters, setFilters]
}
