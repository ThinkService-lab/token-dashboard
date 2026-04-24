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

export const COST_BREAKDOWN_COLORS = {
  tokenCostUsd: '#6366f1',
  webSearchCostUsd: '#f59e0b',
  codeExecutionCostUsd: '#f87171',
}

export const GROUP_BY_PALETTE = [
  '#6366f1', '#f59e0b', '#22d3ee', '#34d399', '#f87171',
  '#a78bfa', '#fb923c', '#4ade80', '#60a5fa', '#e879f9',
]
