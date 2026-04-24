import type { ProviderAdapter, FilterState, NormalizedUsageData, NormalizedCostData } from './types'

// OpenAI adapter stub — interface satisfied, ready for implementation.
// OpenAI usage API: https://platform.openai.com/docs/api-reference/usage
export const openaiAdapter: ProviderAdapter = {
  id: 'openai',
  label: 'OpenAI / Codex',
  color: '#10a37f',
  adminKeyHint: 'sk-admin-...',
  groupByDimensions: ['model'],
  models: [],

  async validateKey(apiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/organization/usage/completions?start_time=0&limit=1', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return res.ok
    } catch {
      return false
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchUsage(_filters: FilterState, _apiKey: string): Promise<NormalizedUsageData> {
    // TODO: implement OpenAI usage endpoint
    return { buckets: [], hasMore: false }
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchCosts(_filters: FilterState, _apiKey: string): Promise<NormalizedCostData> {
    // TODO: implement OpenAI cost endpoint
    return { buckets: [], hasMore: false }
  },
}
