'use client'
import { useEndpointData } from '@/hooks/useEndpointData'
import type { FilterState, NormalizedAudioData } from '@/lib/providers/types'

export function useAudioData(providerId: string, filters: FilterState) {
  return useEndpointData<NormalizedAudioData>('audio', providerId, filters)
}
