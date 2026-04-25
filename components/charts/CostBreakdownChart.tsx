'use client'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'
import { formatDate, formatUSD } from '@/lib/formatters'
import { COST_BREAKDOWN_COLORS } from '@/lib/constants'
import type { Granularity, NormalizedCostBucket } from '@/lib/providers/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  buckets: NormalizedCostBucket[]
  granularity: Granularity
  isLoading?: boolean
}

export function CostBreakdownChart({ buckets, granularity, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-4 w-44" /></CardHeader>
        <CardContent><Skeleton className="h-56 w-full" /></CardContent>
      </Card>
    )
  }

  const data = buckets.map((bucket) => ({
    t: formatDate(bucket.timestamp, granularity),
    tokens: bucket.tokenCostUsd,
    webSearch: bucket.webSearchCostUsd ?? 0,
    codeExecution: bucket.codeExecutionCostUsd ?? 0,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Anthropic Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="t" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatUSD} tick={{ fontSize: 11 }} width={60} />
            <Tooltip
              formatter={(value: unknown) => formatUSD(Number(value))}
              labelStyle={{ fontSize: 11 }}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="tokens" name="Token cost" stackId="cost" fill={COST_BREAKDOWN_COLORS.tokenCostUsd} />
            <Bar dataKey="webSearch" name="Web search" stackId="cost" fill={COST_BREAKDOWN_COLORS.webSearchCostUsd} />
            <Bar dataKey="codeExecution" name="Code execution" stackId="cost" fill={COST_BREAKDOWN_COLORS.codeExecutionCostUsd} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
