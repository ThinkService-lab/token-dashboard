'use client'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'
import { formatDate, formatTokenCount } from '@/lib/formatters'
import { GROUP_BY_PALETTE } from '@/lib/constants'
import type { Granularity, GroupByDimension, NormalizedUsageBucket } from '@/lib/providers/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  buckets: NormalizedUsageBucket[]
  dimension: GroupByDimension
  granularity: Granularity
  isLoading?: boolean
}

export function GroupByStackedChart({ buckets, dimension, granularity, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-4 w-44" /></CardHeader>
        <CardContent><Skeleton className="h-56 w-full" /></CardContent>
      </Card>
    )
  }

  const values = Array.from(new Set(
    buckets.map((bucket) => bucket.groupBy?.[dimension] ?? 'Unknown')
  ))
  const byTimestamp = new Map<string, Record<string, string | number>>()

  buckets.forEach((bucket) => {
    const label = formatDate(bucket.timestamp, granularity)
    const value = bucket.groupBy?.[dimension] ?? 'Unknown'
    const row = byTimestamp.get(label) ?? { t: label }
    row[value] = Number(row[value] ?? 0) + bucket.totalTokens
    byTimestamp.set(label, row)
  })

  const data = Array.from(byTimestamp.values())

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Completions by {dimension.replace('_', ' ')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="t" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatTokenCount} tick={{ fontSize: 11 }} width={54} />
            <Tooltip
              formatter={(value: unknown) => formatTokenCount(Number(value))}
              labelStyle={{ fontSize: 11 }}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            {values.map((value, index) => (
              <Bar
                key={value}
                dataKey={value}
                stackId="group"
                fill={GROUP_BY_PALETTE[index % GROUP_BY_PALETTE.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
