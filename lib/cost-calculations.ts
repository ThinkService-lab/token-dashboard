import type { NormalizedUsageBucket, NormalizedCostBucket } from './providers/types'

export function computeCacheHitRate(buckets: NormalizedUsageBucket[]): number {
  const cached = buckets.reduce((s, b) => s + b.cachedInputTokens, 0)
  const uncached = buckets.reduce((s, b) => s + b.inputTokens, 0)
  const total = cached + uncached
  return total === 0 ? 0 : cached / total
}

export function computeTotalTokens(buckets: NormalizedUsageBucket[]): number {
  return buckets.reduce((s, b) => s + b.totalTokens, 0)
}

export function computeTotalCost(buckets: NormalizedCostBucket[]): number {
  return buckets.reduce((s, b) => s + b.totalCostUsd, 0)
}

export function computeAvgDailyCost(buckets: NormalizedCostBucket[]): number {
  if (buckets.length === 0) return 0
  const total = computeTotalCost(buckets)
  const days = Math.max(1, Math.ceil(buckets.length))
  return total / days
}

export function computePeriodDelta(current: number, previous: number): number {
  if (previous === 0) return 0
  return (current - previous) / previous
}

export function sparklineFromBuckets(buckets: NormalizedCostBucket[]): number[] {
  return buckets.map((b) => b.totalCostUsd)
}

export function tokenSparkline(buckets: NormalizedUsageBucket[]): number[] {
  return buckets.map((b) => b.totalTokens)
}
