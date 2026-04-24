export interface NormalizedUsageBucket {
  timestamp: string
  inputTokens: number
  cachedInputTokens: number
  cacheCreationTokens: number
  outputTokens: number
  totalTokens: number
  groupBy?: Record<string, string>
}

export interface NormalizedCostBucket {
  timestamp: string
  tokenCostUsd: number
  webSearchCostUsd?: number
  codeExecutionCostUsd?: number
  otherCostsUsd: number
  totalCostUsd: number
  groupBy?: Record<string, string>
}

export interface NormalizedEmbeddingsUsage {
  timestamp: string
  model: string
  inputTokens: number
  requests: number
}

export interface NormalizedImageUsage {
  timestamp: string
  model: string
  size: string
  quality: string
  imagesGenerated: number
}

export interface NormalizedAudioUsage {
  timestamp: string
  model: string
  type: 'speech' | 'transcription'
  seconds: number
  characters: number
}

export interface NormalizedToolUseUsage {
  timestamp: string
  model: string
  inputTokens: number
  outputTokens: number
  requests: number
}

export interface NormalizedUsageData {
  buckets: NormalizedUsageBucket[]
  hasMore: boolean
}

export interface NormalizedCostData {
  buckets: NormalizedCostBucket[]
  hasMore: boolean
}

export interface NormalizedEmbeddingsData {
  buckets: NormalizedEmbeddingsUsage[]
}

export interface NormalizedImageData {
  buckets: NormalizedImageUsage[]
}

export interface NormalizedAudioData {
  buckets: NormalizedAudioUsage[]
}

export interface NormalizedToolUseData {
  buckets: NormalizedToolUseUsage[]
}

export type Granularity = '1min' | '1hr' | '1day'

export type GroupByDimension = 'model' | 'workspace' | 'api_key' | 'service_tier' | 'context_window'

export interface FilterState {
  start?: string
  end?: string
  granularity: Granularity
  groupBy: GroupByDimension[]
}

export interface ModelConfig {
  id: string
  label: string
  inputCostPerMillion: number
  outputCostPerMillion: number
  cacheReadCostPerMillion?: number
  cacheWriteCostPerMillion?: number
}

export interface ClaudeCodeUserBucket {
  timestamp: string
  userEmail: string
  userId: string
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  totalTokens: number
  estimatedCostUsd: number
}

export interface ClaudeCodeData {
  buckets: ClaudeCodeUserBucket[]
  hasMore: boolean
}

export interface ProviderAdapter {
  id: string
  label: string
  color: string
  validateKey(apiKey: string): Promise<boolean>
  fetchUsage(filters: FilterState, apiKey: string): Promise<NormalizedUsageData>
  fetchCosts(filters: FilterState, apiKey: string): Promise<NormalizedCostData>
  fetchClaudeCode?(filters: FilterState, apiKey: string): Promise<ClaudeCodeData>
  fetchEmbeddingsUsage?(filters: FilterState, apiKey: string): Promise<NormalizedEmbeddingsData>
  fetchImageUsage?(filters: FilterState, apiKey: string): Promise<NormalizedImageData>
  fetchAudioUsage?(filters: FilterState, apiKey: string): Promise<NormalizedAudioData>
  fetchToolUseUsage?(filters: FilterState, apiKey: string): Promise<NormalizedToolUseData>
  groupByDimensions: GroupByDimension[]
  models: ModelConfig[]
  adminKeyHint: string
}
