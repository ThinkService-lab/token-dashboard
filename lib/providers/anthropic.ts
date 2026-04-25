import type {
  ProviderAdapter,
  FilterState,
  NormalizedToolUseData,
  ClaudeCodeData,
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

type AnthropicPage<T> = {
  data?: T[]
  has_more?: boolean
  next_page?: string | null
}

type UsageBucket = {
  starting_at: string
  results?: UsageResult[]
}

type UsageResult = {
  uncached_input_tokens?: number
  input_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
  cache_creation?: {
    ephemeral_1h_input_tokens?: number
    ephemeral_5m_input_tokens?: number
  }
  output_tokens?: number
  num_model_requests?: number
  server_tool_use?: {
    web_search_requests?: number
  }
  model?: string | null
  workspace_id?: string | null
  api_key_id?: string | null
  service_tier?: string | null
  context_window?: string | null
}

type CostBucket = {
  starting_at: string
  results?: Array<{
    amount?: string
    cost_type?: 'tokens' | 'web_search' | 'code_execution' | string | null
    workspace_id?: string | null
    description?: string | null
  }>
}

type ClaudeCodeRecord = {
  date?: string
  actor?: {
    type?: string
    email_address?: string
    api_key_name?: string
  }
  core_metrics?: {
    num_sessions?: number
  }
  model_breakdown?: Array<{
    model?: string
    tokens?: {
      input?: number
      output?: number
      cache_read?: number
      cache_creation?: number
    }
    estimated_cost?: {
      amount?: number
      currency?: string
    }
  }>
}

function defaultStartIso(days = 30): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString()
}

function defaultEndIso(): string {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString()
}

function toClaudeCodeDate(value?: string): string {
  return (value ? new Date(value) : new Date()).toISOString().slice(0, 10)
}

function granularityToBucketWidth(granularity: string): '1m' | '1h' | '1d' {
  if (granularity === '1min') return '1m'
  if (granularity === '1hr') return '1h'
  return '1d'
}

function toAnthropicGroupBy(dimension: GroupByDimension): string {
  if (dimension === 'workspace') return 'workspace_id'
  if (dimension === 'api_key') return 'api_key_id'
  return dimension
}

function fromAnthropicGroupBy(result: UsageResult): Record<string, string> | undefined {
  const groupBy: Record<string, string> = {}
  if (result.model) groupBy.model = result.model
  if (result.workspace_id) groupBy.workspace = result.workspace_id
  if (result.api_key_id) groupBy.api_key = result.api_key_id
  if (result.service_tier) groupBy.service_tier = result.service_tier
  if (result.context_window) groupBy.context_window = result.context_window
  return Object.keys(groupBy).length > 0 ? groupBy : undefined
}

function buildUsageParams(filters: FilterState, fallbackDays = 30): URLSearchParams {
  const params = new URLSearchParams()
  params.set('starting_at', filters.start ?? defaultStartIso(fallbackDays))
  if (filters.end) {
    params.set('ending_at', filters.end)
  } else {
    params.set('ending_at', defaultEndIso())
  }
  params.set('bucket_width', granularityToBucketWidth(filters.granularity))
  params.set('limit', '31')
  filters.groupBy.forEach((dimension) => params.append('group_by[]', toAnthropicGroupBy(dimension)))
  return params
}

function buildCostParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams()
  params.set('starting_at', filters.start ?? defaultStartIso(30))
  if (filters.end) params.set('ending_at', filters.end)
  params.set('bucket_width', '1d')
  params.set('limit', '31')
  params.append('group_by[]', 'description')
  if (filters.groupBy.includes('workspace')) params.append('group_by[]', 'workspace_id')
  return params
}

async function fetchAll<T>(url: string, apiKey: string): Promise<T[]> {
  const results: T[] = []
  let nextPage: string | null = null

  do {
    const fetchUrl: string = nextPage ? `${url}&page=${encodeURIComponent(nextPage)}` : url
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
    const json: AnthropicPage<T> = await res.json()
    results.push(...(json.data ?? []))
    nextPage = json.has_more ? (json.next_page ?? null) : null
  } while (nextPage)

  return results
}

function getUsageTotals(result: UsageResult) {
  const input = result.uncached_input_tokens ?? result.input_tokens ?? 0
  const cached = result.cache_read_input_tokens ?? 0
  const cacheCreate = result.cache_creation_input_tokens ??
    (result.cache_creation?.ephemeral_1h_input_tokens ?? 0) +
    (result.cache_creation?.ephemeral_5m_input_tokens ?? 0)
  const output = result.output_tokens ?? 0
  return { input, cached, cacheCreate, output, total: input + cached + cacheCreate + output }
}

function parseUsdAmount(amount?: string | number): number {
  const numeric = Number(amount ?? 0)
  // The live Admin API currently returns decimal USD amounts (for example "1.7535").
  return Number.isFinite(numeric) ? numeric : 0
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
      const res = await fetch(`${BASE}/v1/organizations/me`, {
        headers: { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
      })
      return res.ok
    } catch {
      return false
    }
  },

  async fetchUsage(filters, apiKey) {
    const params = buildUsageParams(filters)
    const raw = await fetchAll<UsageBucket>(
      `${BASE}/v1/organizations/usage_report/messages?${params}`,
      apiKey
    )
    const buckets = raw.flatMap((bucket) =>
      (bucket.results ?? []).map((result) => {
        const totals = getUsageTotals(result)
        return {
          timestamp: bucket.starting_at,
          inputTokens: totals.input,
          cachedInputTokens: totals.cached,
          cacheCreationTokens: totals.cacheCreate,
          outputTokens: totals.output,
          totalTokens: totals.total,
          groupBy: fromAnthropicGroupBy(result),
        }
      })
    )
    return { buckets, hasMore: false }
  },

  async fetchCosts(filters, apiKey) {
    const params = buildCostParams(filters)
    const raw = await fetchAll<CostBucket>(
      `${BASE}/v1/organizations/cost_report?${params}`,
      apiKey
    )
    const buckets = raw.map((bucket) => {
      let tokenCost = 0
      let webSearch = 0
      let codeExec = 0
      let other = 0

      ;(bucket.results ?? []).forEach((result) => {
        const amount = parseUsdAmount(result.amount)
        if (result.cost_type === 'tokens') tokenCost += amount
        else if (result.cost_type === 'web_search') webSearch += amount
        else if (result.cost_type === 'code_execution') codeExec += amount
        else other += amount
      })

      return {
        timestamp: bucket.starting_at,
        tokenCostUsd: tokenCost,
        webSearchCostUsd: webSearch,
        codeExecutionCostUsd: codeExec,
        otherCostsUsd: other,
        totalCostUsd: tokenCost + webSearch + codeExec + other,
      }
    })
    return { buckets, hasMore: false }
  },

  async fetchClaudeCode(filters, apiKey): Promise<ClaudeCodeData> {
    const params = new URLSearchParams({
      starting_at: toClaudeCodeDate(filters.start),
      limit: '1000',
    })
    const raw = await fetchAll<ClaudeCodeRecord>(
      `${BASE}/v1/organizations/usage_report/claude_code?${params}`,
      apiKey
    )
    const buckets = raw.map((record) => {
      const totals = (record.model_breakdown ?? []).reduce(
        (acc, model) => {
          acc.input += model.tokens?.input ?? 0
          acc.output += model.tokens?.output ?? 0
          acc.cached += model.tokens?.cache_read ?? 0
          acc.cacheCreate += model.tokens?.cache_creation ?? 0
          acc.cost += parseUsdAmount(model.estimated_cost?.amount)
          return acc
        },
        { input: 0, output: 0, cached: 0, cacheCreate: 0, cost: 0 }
      )

      return {
        timestamp: record.date ?? `${toClaudeCodeDate(filters.start)}T00:00:00Z`,
        userEmail: record.actor?.email_address ?? record.actor?.api_key_name ?? 'unknown',
        userId: record.actor?.type ?? '',
        inputTokens: totals.input,
        outputTokens: totals.output,
        cachedInputTokens: totals.cached,
        totalTokens: totals.input + totals.output + totals.cached + totals.cacheCreate,
        estimatedCostUsd: totals.cost,
      }
    })
    return { buckets, hasMore: false }
  },

  async fetchToolUseUsage(filters, apiKey): Promise<NormalizedToolUseData> {
    const params = buildUsageParams({ ...filters, groupBy: ['model'] })
    const raw = await fetchAll<UsageBucket>(
      `${BASE}/v1/organizations/usage_report/messages?${params}`,
      apiKey
    )
    const buckets = raw.flatMap((bucket) =>
      (bucket.results ?? []).map((result) => {
        const totals = getUsageTotals(result)
        return {
          timestamp: bucket.starting_at,
          model: result.model ?? 'unknown',
          inputTokens: totals.input,
          outputTokens: totals.output,
          requests: result.server_tool_use?.web_search_requests ?? 0,
        }
      })
    )
    return { buckets }
  },
}
