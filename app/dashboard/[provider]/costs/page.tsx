'use client'
import { use, Suspense } from 'react'
import { useFilters } from '@/hooks/useFilters'
import { useCostData } from '@/hooks/useCostData'
import { useApiKey } from '@/hooks/useApiKey'
import { Topbar } from '@/components/layout/Topbar'
import { SummaryCard } from '@/components/cards/SummaryCard'
import { CostTrendChart } from '@/components/charts/CostTrendChart'
import { computeTotalCost, computeAvgDailyCost, sparklineFromBuckets } from '@/lib/cost-calculations'
import { formatUSD } from '@/lib/formatters'
import { providers } from '@/lib/providers'

function CostsContent({ providerId }: { providerId: string }) {
  const [filters] = useFilters()
  const { apiKey } = useApiKey(providerId)
  const { data, isLoading } = useCostData(providerId, apiKey, filters)
  const provider = providers[providerId]
  const buckets = data?.buckets ?? []

  const totalCost = computeTotalCost(buckets)
  const avgDaily = computeAvgDailyCost(buckets)
  const tokenCost = buckets.reduce((s, b) => s + b.tokenCostUsd, 0)
  const otherCost = buckets.reduce((s, b) => s + b.otherCostsUsd, 0)

  return (
    <>
      <Topbar title="Cost Breakdown" availableGroupBy={provider?.groupByDimensions} />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Total Cost" value={formatUSD(totalCost)} sparkline={sparklineFromBuckets(buckets)} isLoading={isLoading} color="#f59e0b" />
          <SummaryCard label="Avg Daily Cost" value={formatUSD(avgDaily)} isLoading={isLoading} color="#6366f1" />
          <SummaryCard label="Token Costs" value={formatUSD(tokenCost)} isLoading={isLoading} color="#6366f1" />
          <SummaryCard label="Other Costs" value={formatUSD(otherCost)} isLoading={isLoading} color="#f87171" />
        </div>
        <CostTrendChart buckets={buckets} granularity={filters.granularity} isLoading={isLoading} />
      </div>
    </>
  )
}

export default function CostsPage({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = use(params)
  return <Suspense><CostsContent providerId={provider} /></Suspense>
}
