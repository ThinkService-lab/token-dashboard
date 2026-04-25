'use client'
import { use } from 'react'
import { Suspense } from 'react'
import { useFilters } from '@/hooks/useFilters'
import { useUsageData } from '@/hooks/useUsageData'
import { useCostData } from '@/hooks/useCostData'
import { Topbar } from '@/components/layout/Topbar'
import { SummaryCard } from '@/components/cards/SummaryCard'
import { TokenTrendChart } from '@/components/charts/TokenTrendChart'
import { CostTrendChart } from '@/components/charts/CostTrendChart'
import { ModelShareChart } from '@/components/charts/ModelShareChart'
import { TokenBreakdownChart } from '@/components/charts/TokenBreakdownChart'
import {
  computeTotalTokens,
  computeTotalCost,
  computeCacheHitRate,
  computeAvgDailyCost,
  sparklineFromBuckets,
  tokenSparkline,
} from '@/lib/cost-calculations'
import { formatTokenCount, formatUSD, formatPercent } from '@/lib/formatters'
import { providers } from '@/lib/providers'

function OverviewContent({ providerId }: { providerId: string }) {
  const [filters] = useFilters()
  const { data: usageData, isLoading: usageLoading } = useUsageData(providerId, filters)
  const { data: costData, isLoading: costLoading } = useCostData(providerId, filters)
  const provider = providers[providerId]

  const buckets = usageData?.buckets ?? []
  const costBuckets = costData?.buckets ?? []

  const totalTokens = computeTotalTokens(buckets)
  const totalCost = computeTotalCost(costBuckets)
  const cacheHitRate = computeCacheHitRate(buckets)
  const avgDailyCost = computeAvgDailyCost(costBuckets)

  return (
    <>
      <Topbar
        title="Overview"
        availableGroupBy={provider?.groupByDimensions}
      />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Tokens"
            value={formatTokenCount(totalTokens)}
            sparkline={tokenSparkline(buckets)}
            isLoading={usageLoading}
            color="#6366f1"
          />
          <SummaryCard
            label="Total Cost"
            value={formatUSD(totalCost)}
            sparkline={sparklineFromBuckets(costBuckets)}
            isLoading={costLoading}
            color="#f59e0b"
          />
          <SummaryCard
            label="Cache Hit Rate"
            value={formatPercent(cacheHitRate)}
            isLoading={usageLoading}
            color="#22d3ee"
          />
          <SummaryCard
            label="Avg Daily Cost"
            value={formatUSD(avgDailyCost)}
            isLoading={costLoading}
            color="#a78bfa"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TokenTrendChart buckets={buckets} granularity={filters.granularity} isLoading={usageLoading} />
          <CostTrendChart buckets={costBuckets} granularity={filters.granularity} isLoading={costLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TokenBreakdownChart buckets={buckets} granularity={filters.granularity} isLoading={usageLoading} />
          <ModelShareChart buckets={buckets} isLoading={usageLoading} />
        </div>
      </div>
    </>
  )
}

export default function OverviewPage({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = use(params)
  return (
    <Suspense>
      <OverviewContent providerId={provider} />
    </Suspense>
  )
}
