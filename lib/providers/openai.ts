import type {
  ProviderAdapter,
  FilterState,
  NormalizedUsageData,
  NormalizedCostData,
  NormalizedEmbeddingsData,
  NormalizedImageData,
  NormalizedAudioData,
  NormalizedToolUseData,
  ModelConfig,
} from './types'

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

interface OpenAIEmbeddingsBucket {
  start_time: number
  results: Array<{
    input_tokens: number
    num_model_requests: number
    model_ids: string[]
  }>
}

interface OpenAIImagesBucket {
  start_time: number
  results: Array<{
    images: number
    model_ids: string[]
    size: string
    quality: string
  }>
}

interface OpenAIAudioSpeechesBucket {
  start_time: number
  results: Array<{
    characters: number
    num_model_requests: number
    model_ids: string[]
  }>
}

interface OpenAIAudioTranscriptionsBucket {
  start_time: number
  results: Array<{
    seconds: number
    num_model_requests: number
    model_ids: string[]
  }>
}

interface OpenAICodeInterpreterBucket {
  start_time: number
  results: Array<{
    sessions: number
    model_ids: string[]
  }>
}

interface OpenAICostsBucket {
  start_time: number
  results: Array<{
    amount: { value: number; currency: string }
    line_item: string
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
    const now = Math.floor(Date.now() / 1000)
    const startTime = toUnix(filters.start) ?? now - 30 * 86400
    const endTime = toUnix(filters.end) ?? now
    const bucketWidth = granularityToBucketWidth(filters.granularity)

    // Try direct cost endpoint first
    const costsUrl = `${BASE}/v1/organization/costs?start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}`
    const costsRes = await fetch(costsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (costsRes.ok) {
      const json: { data?: OpenAICostsBucket[]; has_more?: boolean; next_page?: string } = await costsRes.json()
      const raw = json.data ?? []
      const buckets = raw.map((item) => {
        const tokenCost = item.results
          .filter((r) => r.line_item === 'completion')
          .reduce((sum, r) => sum + r.amount.value, 0)
        const otherCosts = item.results
          .filter((r) => r.line_item !== 'completion')
          .reduce((sum, r) => sum + r.amount.value, 0)
        return {
          timestamp: new Date(item.start_time * 1000).toISOString(),
          tokenCostUsd: tokenCost,
          otherCostsUsd: otherCosts,
          totalCostUsd: tokenCost + otherCosts,
        }
      })
      return { buckets, hasMore: json.has_more ?? false }
    }

    // Fallback: derive from usage + pricing table
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

  async fetchEmbeddingsUsage(filters: FilterState, apiKey: string): Promise<NormalizedEmbeddingsData> {
    const now = Math.floor(Date.now() / 1000)
    const startTime = toUnix(filters.start) ?? now - 30 * 86400
    const endTime = toUnix(filters.end) ?? now
    const bucketWidth = granularityToBucketWidth(filters.granularity)

    const raw = await fetchAllPages<OpenAIEmbeddingsBucket>(
      `${BASE}/v1/organization/usage/embeddings?start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}&group_by[]=model`,
      apiKey
    )

    const buckets = raw.flatMap((item) =>
      item.results.map((r) => ({
        timestamp: new Date(item.start_time * 1000).toISOString(),
        model: r.model_ids[0] ?? 'unknown',
        inputTokens: r.input_tokens,
        requests: r.num_model_requests,
      }))
    )
    return { buckets }
  },

  async fetchImageUsage(filters: FilterState, apiKey: string): Promise<NormalizedImageData> {
    const now = Math.floor(Date.now() / 1000)
    const startTime = toUnix(filters.start) ?? now - 30 * 86400
    const endTime = toUnix(filters.end) ?? now
    const bucketWidth = granularityToBucketWidth(filters.granularity)

    const raw = await fetchAllPages<OpenAIImagesBucket>(
      `${BASE}/v1/organization/usage/images?start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}&group_by[]=model`,
      apiKey
    )

    const buckets = raw.flatMap((item) =>
      item.results.map((r) => ({
        timestamp: new Date(item.start_time * 1000).toISOString(),
        model: r.model_ids[0] ?? 'unknown',
        size: r.size ?? 'unknown',
        quality: r.quality ?? 'standard',
        imagesGenerated: r.images,
      }))
    )
    return { buckets }
  },

  async fetchAudioUsage(filters: FilterState, apiKey: string): Promise<NormalizedAudioData> {
    const now = Math.floor(Date.now() / 1000)
    const startTime = toUnix(filters.start) ?? now - 30 * 86400
    const endTime = toUnix(filters.end) ?? now
    const bucketWidth = granularityToBucketWidth(filters.granularity)
    const baseParams = `start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}&group_by[]=model`

    const [speechRaw, transcriptionRaw] = await Promise.all([
      fetchAllPages<OpenAIAudioSpeechesBucket>(
        `${BASE}/v1/organization/usage/audio_speeches?${baseParams}`,
        apiKey
      ),
      fetchAllPages<OpenAIAudioTranscriptionsBucket>(
        `${BASE}/v1/organization/usage/audio_transcriptions?${baseParams}`,
        apiKey
      ),
    ])

    const speechBuckets = speechRaw.flatMap((item) =>
      item.results.map((r) => ({
        timestamp: new Date(item.start_time * 1000).toISOString(),
        model: r.model_ids[0] ?? 'unknown',
        type: 'speech' as const,
        seconds: 0,
        characters: r.characters,
      }))
    )

    const transcriptionBuckets = transcriptionRaw.flatMap((item) =>
      item.results.map((r) => ({
        timestamp: new Date(item.start_time * 1000).toISOString(),
        model: r.model_ids[0] ?? 'unknown',
        type: 'transcription' as const,
        seconds: r.seconds,
        characters: 0,
      }))
    )

    return { buckets: [...speechBuckets, ...transcriptionBuckets] }
  },

  async fetchToolUseUsage(filters: FilterState, apiKey: string): Promise<NormalizedToolUseData> {
    const now = Math.floor(Date.now() / 1000)
    const startTime = toUnix(filters.start) ?? now - 30 * 86400
    const endTime = toUnix(filters.end) ?? now
    const bucketWidth = granularityToBucketWidth(filters.granularity)

    const raw = await fetchAllPages<OpenAICodeInterpreterBucket>(
      `${BASE}/v1/organization/usage/code_interpreter_sessions?start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}&group_by[]=model`,
      apiKey
    )

    const buckets = raw.flatMap((item) =>
      item.results.map((r) => ({
        timestamp: new Date(item.start_time * 1000).toISOString(),
        model: r.model_ids[0] ?? 'unknown',
        inputTokens: 0,
        outputTokens: 0,
        requests: r.sessions,
      }))
    )
    return { buckets }
  },
}
