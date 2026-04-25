'use client'
import { useEndpointData } from '@/hooks/useEndpointData'
import type { FilterState, NormalizedCostData } from '@/lib/providers/types'

export function useCostData(providerId: string, filters: FilterState) {
  return useEndpointData<NormalizedCostData>('costs', providerId, filters)
}
