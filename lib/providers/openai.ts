import type { ProviderAdapter, FilterState, NormalizedUsageData, NormalizedCostData, ModelConfig } from './types'

const BASE = 'https://api.openai.com'

// Pricing per million tokens as of 2025-04
const MODELS: ModelConfig[] = [
  { id: 'gpt-4o',             label: 'GPT-4o',             inputCostPerMillion: 2.5,  outputCostPerMillion: 10,   cacheReadCostPerMillion: 1.25 },
  { id: 'gpt-4o-mini',        label: 'GPT-4o mini',        inputCostPerMillion: 0.15, outputCostPerMillion: 0.6,  cacheReadCostPerMillion: 0.075 },
  { id: 'gpt-4.1',            label: 'GPT-4.1',            inputCostPerMillion: 2,    outputCostPerMillion: 8,    cacheReadCostPerMillion: 0.5 },
  { id: 'gpt-4.1-mini',       label: 'GPT-4.1 mini',       inputCostPerMillion: 0.4,  outputCostPerMillion: 1.6,  cacheReadCostPerMillion: 0.1 },
  { id: 'gpt-4.1-nano',       label: 'GPT-4.1 nano',       inputCostPerMillion: 0.1,  outputCostPerMillion: 0.4,  cacheReadCostPerMillion: 0.025 },
  { id: 'o3',                 label: 'o3',                 inputCostPerMillion: 10,   outputCostPerMillion: 40 },
  { id: 'o4-mini',            label: 'o4-mini',            inputCostPerMillion: 1.1,  outputCostPerMillion: 4.4,  cacheReadCostPerMillion: 0.275 },
]

const PRICING = Object.fromEntries(MODELS.map((m) => [m.id, m]))

function toUnix(iso: string | undefined): number | undefined {
  return iso ? Math.floor(new Date(iso).getTime() / 1000) : undefined
}

function granularityToBucketWidth(g: string): string {
  if (g === '1min') return '1m'
  if (g === '1hr') return '1h'
  return '1d'
}

async function fetchAllPages<T>(url: string, apiKey: string): Promise<T[]> {
  const results: T[] = []
  let nextPage: string | null = null

  do {
    const fetchUrl = nextPage ? `${url}&page=${nextPage}` : url
    const res = await fetch(fetchUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI API error ${res.status}: ${err}`)
    }
    const json: { data?: T[]; has_more?: boolean; next_page?: string } = await res.json()
    results.push(...(json.data ?? []))
    nextPage = json.has_more ? (json.next_page ?? null) : null
  } while (nextPage)

  return results
}

interface OpenAICompletionBucket {
  start_time: number
  results: Array<{
    input_tokens: number
    output_tokens: number
    input_cached_tokens: number
    num_model_requests: number
    model_ids: string[]
  }>
}

export const openaiAdapter: ProviderAdapter = {
  id: 'openai',
  label: 'OpenAI / Codex',
  color: '#10a37f',
  adminKeyHint: 'sk-admin-...',
  groupByDimensions: ['model'],
  models: MODELS,

  async validateKey(apiKey) {
    try {
      const now = Math.floor(Date.now() / 1000)
      const res = await fetch(
        `${BASE}/v1/organization/usage/completions?start_time=${now - 86400}&limit=1`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      )
      return res.ok
    } catch {
      return false
    }
  },

  async fetchUsage(filters: FilterState, apiKey: string): Promise<NormalizedUsageData> {
    const now = Math.floor(Date.now() / 1000)
    const startTime = toUnix(filters.start) ?? now - 30 * 86400
    const endTime = toUnix(filters.end) ?? now
    const bucketWidth = granularityToBucketWidth(filters.granularity)
    const groupBy = filters.groupBy.includes('model') ? '&group_by[]=model' : ''

    const raw = await fetchAllPages<OpenAICompletionBucket>(
      `${BASE}/v1/organization/usage/completions?start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}${groupBy}`,
      apiKey
    )

    const buckets = raw.map((item) => {
      const agg = item.results.reduce(
        (acc, r) => ({
          input: acc.input + r.input_tokens,
          cached: acc.cached + r.input_cached_tokens,
          output: acc.output + r.output_tokens,
        }),
        { input: 0, cached: 0, output: 0 }
      )

      const modelIds = [...new Set(item.results.flatMap((r) => r.model_ids))]
      const groupByRecord = modelIds.length > 0 ? { model: modelIds.join(',') } : undefined

      return {
        timestamp: new Date(item.start_time * 1000).toISOString(),
        inputTokens: agg.input,
        cachedInputTokens: agg.cached,
        cacheCreationTokens: 0,
        outputTokens: agg.output,
        totalTokens: agg.input + agg.cached + agg.output,
        groupBy: groupByRecord,
      }
    })

    return { buckets, hasMore: false }
  },

  async fetchCosts(filters: FilterState, apiKey: string): Promise<NormalizedCostData> {
    // OpenAI has no direct cost endpoint — derive costs from usage + pricing table
    const now = Math.floor(Date.now() / 1000)
    const startTime = toUnix(filters.start) ?? now - 30 * 86400
    const endTime = toUnix(filters.end) ?? now
    const bucketWidth = granularityToBucketWidth(filters.granularity)

    // Always group by model for cost computation
    const raw = await fetchAllPages<OpenAICompletionBucket>(
      `${BASE}/v1/organization/usage/completions?start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}&group_by[]=model`,
      apiKey
    )

    const buckets = raw.map((item) => {
      const tokenCost = item.results.reduce((sum, r) => {
        const modelId = r.model_ids[0]
        const pricing = PRICING[modelId]
        if (!pricing) return sum
        const inputCost = ((r.input_tokens - r.input_cached_tokens) * pricing.inputCostPerMillion) / 1_000_000
        const cachedCost = (r.input_cached_tokens * (pricing.cacheReadCostPerMillion ?? pricing.inputCostPerMillion)) / 1_000_000
        const outputCost = (r.output_tokens * pricing.outputCostPerMillion) / 1_000_000
        return sum + inputCost + cachedCost + outputCost
      }, 0)

      return {
        timestamp: new Date(item.start_time * 1000).toISOString(),
        tokenCostUsd: tokenCost,
        otherCostsUsd: 0,
        totalCostUsd: tokenCost,
      }
    })

    return { buckets, hasMore: false }
  },
}
