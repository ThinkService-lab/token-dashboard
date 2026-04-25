'use client'
import { useEndpointData } from '@/hooks/useEndpointData'
import type { FilterState, NormalizedEmbeddingsData } from '@/lib/providers/types'

export function useEmbeddingsData(providerId: string, filters: FilterState) {
  return useEndpointData<NormalizedEmbeddingsData>('embeddings', providerId, filters)
}
