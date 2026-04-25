'use client'
import { useEndpointData } from '@/hooks/useEndpointData'
import type { FilterState, NormalizedToolUseData } from '@/lib/providers/types'

export function useToolUseData(providerId: string, filters: FilterState) {
  return useEndpointData<NormalizedToolUseData>('tool-use', providerId, filters)
}
