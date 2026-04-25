'use client'
import { useEndpointData } from '@/hooks/useEndpointData'
import type { ClaudeCodeData, FilterState } from '@/lib/providers/types'

export function useClaudeCodeData(filters: FilterState, enabled = true) {
  return useEndpointData<ClaudeCodeData>('claude-code', 'anthropic', filters, enabled)
}
