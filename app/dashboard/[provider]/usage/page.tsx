'use client'
import { use, Suspense } from 'react'
import { useFilters } from '@/hooks/useFilters'
import { useUsageData } from '@/hooks/useUsageData'
import { useApiKey } from '@/hooks/useApiKey'
import { Topbar } from '@/components/layout/Topbar'
import { SummaryCard } from '@/components/cards/SummaryCard'
import { TokenTrendChart } from '@/components/charts/TokenTrendChart'
import { TokenBreakdownChart } from '@/components/charts/TokenBreakdownChart'
import { computeTotalTokens, computeCacheHitRate, tokenSparkline } from '@/lib/cost-calculations'
import { formatTokenCount, formatPercent } from '@/lib/formatters'
import { providers } from '@/lib/providers'

function UsageContent({ providerId }: { providerId: string }) {
  const [filters] = useFilters()
  const { apiKey } = useApiKey(providerId)
  const { data, isLoading } = useUsageData(providerId, apiKey, filters)
  const provider = providers[providerId]
  const buckets = data?.buckets ?? []

  const totalInput = buckets.reduce((s, b) => s + b.inputTokens, 0)
  const totalOutput = buckets.reduce((s, b) => s + b.outputTokens, 0)
  const totalCached = buckets.reduce((s, b) => s + b.cachedInputTokens, 0)
  const cacheHit = computeCacheHitRate(buckets)

  return (
    <>
      <Topbar title="Token Usage" availableGroupBy={provider?.groupByDimensions} />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Total Tokens" value={formatTokenCount(computeTotalTokens(buckets))} sparkline={tokenSparkline(buckets)} isLoading={isLoading} />
          <SummaryCard label="Input Tokens" value={formatTokenCount(totalInput)} isLoading={isLoading} color="#6366f1" />
          <SummaryCard label="Output Tokens" value={formatTokenCount(totalOutput)} isLoading={isLoading} color="#f59e0b" />
          <SummaryCard label="Cache Hit Rate" value={formatPercent(cacheHit)} isLoading={isLoading} color="#22d3ee" />
        </div>
        <TokenTrendChart buckets={buckets} granularity={filters.granularity} isLoading={isLoading} />
        <TokenBreakdownChart buckets={buckets} granularity={filters.granularity} isLoading={isLoading} />
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Cached Input Tokens" value={formatTokenCount(totalCached)} isLoading={isLoading} color="#22d3ee" />
          <SummaryCard label="Cache Savings Est." value={`${formatPercent(cacheHit)} cheaper`} isLoading={isLoading} color="#34d399" />
        </div>
      </div>
    </>
  )
}

export default function UsagePage({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = use(params)
  return <Suspense><UsageContent providerId={provider} /></Suspense>
}
