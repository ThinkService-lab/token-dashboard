'use client'
import { useEndpointData } from '@/hooks/useEndpointData'
import type { FilterState, NormalizedImageData } from '@/lib/providers/types'

export function useImageData(providerId: string, filters: FilterState) {
  return useEndpointData<NormalizedImageData>('images', providerId, filters)
}
