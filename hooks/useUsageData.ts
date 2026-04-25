'use client'
import { useEndpointData } from '@/hooks/useEndpointData'
import type { FilterState, NormalizedUsageData } from '@/lib/providers/types'

export function useUsageData(providerId: string, filters: FilterState) {
  return useEndpointData<NormalizedUsageData>('usage', providerId, filters)
}
