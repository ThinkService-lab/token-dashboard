export const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#d97706',
  openai: '#10a37f',
}

export const TOKEN_TYPE_COLORS = {
  inputTokens: '#6366f1',
  cachedInputTokens: '#22d3ee',
  cacheCreationTokens: '#a78bfa',
  outputTokens: '#f59e0b',
}

export const COST_TYPE_COLORS = {
  tokenCostUsd: '#6366f1',
  otherCostsUsd: '#f59e0b',
}

export const DEFAULT_GRANULARITY = '1day' as const

export const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last year', days: 365 },
  { label: 'All time', days: null },
]
