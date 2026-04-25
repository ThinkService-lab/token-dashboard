'use client'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'
import { formatDate, formatUSD } from '@/lib/formatters'
import { COST_BREAKDOWN_COLORS, COST_TYPE_COLORS } from '@/lib/constants'
import type { NormalizedCostBucket, Granularity } from '@/lib/providers/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  buckets: NormalizedCostBucket[]
  granularity: Granularity
  isLoading?: boolean
}

export function CostTrendChart({ buckets, granularity, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-4 w-32" /></CardHeader>
        <CardContent><Skeleton className="h-56 w-full" /></CardContent>
      </Card>
    )
  }

  const data = buckets.map((b) => ({
    t: formatDate(b.timestamp, granularity),
    tokens: b.tokenCostUsd,
    webSearch: b.webSearchCostUsd ?? 0,
    codeExecution: b.codeExecutionCostUsd ?? 0,
    other: b.otherCostsUsd,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Cost Over Time (USD)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="t" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatUSD} tick={{ fontSize: 11 }} width={60} />
            <Tooltip
              formatter={(v: unknown) => formatUSD(Number(v))}
              labelStyle={{ fontSize: 11 }}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="tokens" name="Token cost" stackId="1" stroke={COST_TYPE_COLORS.tokenCostUsd} fill={COST_TYPE_COLORS.tokenCostUsd} fillOpacity={0.3} />
            <Area type="monotone" dataKey="webSearch" name="Web search" stackId="1" stroke={COST_BREAKDOWN_COLORS.webSearchCostUsd} fill={COST_BREAKDOWN_COLORS.webSearchCostUsd} fillOpacity={0.3} />
            <Area type="monotone" dataKey="codeExecution" name="Code execution" stackId="1" stroke={COST_BREAKDOWN_COLORS.codeExecutionCostUsd} fill={COST_BREAKDOWN_COLORS.codeExecutionCostUsd} fillOpacity={0.3} />
            <Area type="monotone" dataKey="other" name="Other costs" stackId="1" stroke={COST_TYPE_COLORS.otherCostsUsd} fill={COST_TYPE_COLORS.otherCostsUsd} fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
