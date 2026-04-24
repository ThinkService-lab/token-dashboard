import type {
  ProviderAdapter,
  FilterState,
  NormalizedUsageData,
  NormalizedCostData,
  ModelConfig,
  GroupByDimension,
} from './types'

const BASE = 'https://api.anthropic.com'
const ANTHROPIC_VERSION = '2023-06-01'

// Pricing as of 2025-04 (per million tokens)
const MODELS: ModelConfig[] = [
  { id: 'claude-opus-4-5',   label: 'Claude Opus 4.5',   inputCostPerMillion: 15,    outputCostPerMillion: 75,   cacheReadCostPerMillion: 1.5,  cacheWriteCostPerMillion: 18.75 },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', inputCostPerMillion: 3,     outputCostPerMillion: 15,   cacheReadCostPerMillion: 0.3,  cacheWriteCostPerMillion: 3.75 },
  { id: 'claude-haiku-4-5',  label: 'Claude Haiku 4.5',  inputCostPerMillion: 0.8,   outputCostPerMillion: 4,    cacheReadCostPerMillion: 0.08, cacheWriteCostPerMillion: 1 },
  { id: 'claude-opus-4-7',   label: 'Claude Opus 4.7',   inputCostPerMillion: 15,    outputCostPerMillion: 75,   cacheReadCostPerMillion: 1.5,  cacheWriteCostPerMillion: 18.75 },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', inputCostPerMillion: 3,     outputCostPerMillion: 15,   cacheReadCostPerMillion: 0.3,  cacheWriteCostPerMillion: 3.75 },
]

function buildParams(filters: FilterState): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.start) p.set('starting_at', filters.start)
  if (filters.end) p.set('ending_at', filters.end)
  p.set('time_window_seconds', granularityToSeconds(filters.granularity).toString())
  filters.groupBy.forEach((dim) => p.append('group_by[]', dim))
  return p
}

function granularityToSeconds(g: string): number {
  if (g === '1min') return 60
  if (g === '1hr') return 3600
  return 86400
}

async function fetchAll<T>(url: string, apiKey: string): Promise<T[]> {
  const results: T[] = []
  let nextPage: string | null = null

  do {
    const fetchUrl: string = nextPage ? `${url}&next_page=${nextPage}` : url
    const res: Response = await fetch(fetchUrl, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic API error ${res.status}: ${err}`)
    }
    const json: { data?: T[]; has_more?: boolean; next_page?: string } = await res.json()
    results.push(...(json.data ?? []))
    nextPage = json.has_more ? (json.next_page ?? null) : null
  } while (nextPage)

  return results
}

export const anthropicAdapter: ProviderAdapter = {
  id: 'anthropic',
  label: 'Claude (Anthropic)',
  color: '#d97706',
  adminKeyHint: 'sk-ant-admin...',
  groupByDimensions: ['model', 'workspace', 'api_key', 'service_tier', 'context_window'] as GroupByDimension[],
  models: MODELS,

  async validateKey(apiKey) {
    try {
      const params = new URLSearchParams({ time_window_seconds: '86400' })
      const res = await fetch(`${BASE}/v1/organizations/usage_report/messages?${params}`, {
        headers: { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
      })
      return res.ok
    } catch {
      return false
    }
  },

  async fetchUsage(filters, apiKey) {
    const params = buildParams(filters)
    const raw = await fetchAll<Record<string, unknown>>(
      `${BASE}/v1/organizations/usage_report/messages?${params}`,
      apiKey
    )
    const buckets = raw.map((item) => {
      const m = (item.metrics as Record<string, number>) ?? {}
      const input = m.input_tokens ?? 0
      const cached = m.cache_read_input_tokens ?? 0
      const cacheCreate = m.cache_creation_input_tokens ?? 0
      const output = m.output_tokens ?? 0
      return {
        timestamp: item.timestamp as string,
        inputTokens: input,
        cachedInputTokens: cached,
        cacheCreationTokens: cacheCreate,
        outputTokens: output,
        totalTokens: input + cached + cacheCreate + output,
        groupBy: item.group_by as Record<string, string> | undefined,
      }
    })
    return { buckets, hasMore: false }
  },

  async fetchCosts(filters, apiKey) {
    const params = buildParams(filters)
    const raw = await fetchAll<Record<string, unknown>>(
      `${BASE}/v1/organizations/cost_report?${params}`,
      apiKey
    )
    const buckets = raw.map((item) => {
      const c = (item.costs as Record<string, number>) ?? {}
      const tokenCost = c.token_usage ?? 0
      const webSearch = c.web_search ?? 0
      const codeExec = c.code_execution ?? 0
      return {
        timestamp: item.timestamp as string,
        tokenCostUsd: tokenCost,
        otherCostsUsd: webSearch + codeExec,
        totalCostUsd: tokenCost + webSearch + codeExec,
        groupBy: item.group_by as Record<string, string> | undefined,
      }
    })
    return { buckets, hasMore: false }
  },
}
