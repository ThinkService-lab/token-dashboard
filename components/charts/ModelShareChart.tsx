'use client'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { formatTokenCount } from '@/lib/formatters'
import type { NormalizedUsageBucket } from '@/lib/providers/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = ['#6366f1', '#f59e0b', '#22d3ee', '#a78bfa', '#34d399', '#f87171']

interface Props {
  buckets: NormalizedUsageBucket[]
  isLoading?: boolean
}

export function ModelShareChart({ buckets, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-4 w-28" /></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    )
  }

  // Aggregate tokens by model from groupBy field
  const modelMap: Record<string, number> = {}
  for (const b of buckets) {
    const model = b.groupBy?.model ?? 'Unknown'
    modelMap[model] = (modelMap[model] ?? 0) + b.totalTokens
  }
  const data = Object.entries(modelMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Usage by Model</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          No data — try grouping by Model
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Usage by Model</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={(v: any) => formatTokenCount(Number(v))} contentStyle={{ fontSize: 11 }} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
