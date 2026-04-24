'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ResponsiveContainer, LineChart, Line } from 'recharts'
import { formatDelta } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  label: string
  value: string
  delta?: number
  sparkline?: number[]
  isLoading?: boolean
  color?: string
}

export function SummaryCard({ label, value, delta, sparkline, isLoading, color = '#6366f1' }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    )
  }

  const isUp = (delta ?? 0) >= 0

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {delta !== undefined && (
              <div className={cn('flex items-center gap-0.5 text-xs', isUp ? 'text-green-600' : 'text-red-500')}>
                {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{formatDelta(delta)} vs prior period</span>
              </div>
            )}
          </div>
          {sparkline && sparkline.length > 1 && (
            <ResponsiveContainer width={64} height={36}>
              <LineChart data={sparkline.map((v) => ({ v }))}>
                <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
