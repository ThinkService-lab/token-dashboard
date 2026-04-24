'use client'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'
import { formatDate, formatTokenCount } from '@/lib/formatters'
import { TOKEN_TYPE_COLORS } from '@/lib/constants'
import type { NormalizedUsageBucket, Granularity } from '@/lib/providers/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  buckets: NormalizedUsageBucket[]
  granularity: Granularity
  isLoading?: boolean
}

export function TokenBreakdownChart({ buckets, granularity, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-4 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-56 w-full" /></CardContent>
      </Card>
    )
  }

  const data = buckets.map((b) => ({
    t: formatDate(b.timestamp, granularity),
    input: b.inputTokens,
    cached: b.cachedInputTokens,
    cacheCreate: b.cacheCreationTokens,
    output: b.outputTokens,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Token Type Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="t" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatTokenCount} tick={{ fontSize: 11 }} width={50} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => formatTokenCount(Number(v))}
              labelStyle={{ fontSize: 11 }}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="input" name="Input" stackId="a" fill={TOKEN_TYPE_COLORS.inputTokens} />
            <Bar dataKey="cached" name="Cached" stackId="a" fill={TOKEN_TYPE_COLORS.cachedInputTokens} />
            <Bar dataKey="cacheCreate" name="Cache Write" stackId="a" fill={TOKEN_TYPE_COLORS.cacheCreationTokens} />
            <Bar dataKey="output" name="Output" stackId="a" fill={TOKEN_TYPE_COLORS.outputTokens} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
