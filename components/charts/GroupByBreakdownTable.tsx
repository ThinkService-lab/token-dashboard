'use client'
import { useMemo, useState } from 'react'
import type { GroupByDimension, NormalizedUsageBucket } from '@/lib/providers/types'
import { formatPercent, formatTokenCount } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type SortKey = 'value' | 'input' | 'output' | 'cached' | 'total' | 'share'

interface Props {
  buckets: NormalizedUsageBucket[]
  dimension: GroupByDimension
}

export function GroupByBreakdownTable({ buckets, dimension }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const rows = useMemo(() => {
    const totalTokens = buckets.reduce((sum, bucket) => sum + bucket.totalTokens, 0)
    const grouped = new Map<string, {
      value: string
      input: number
      output: number
      cached: number
      total: number
      share: number
    }>()

    buckets.forEach((bucket) => {
      const value = bucket.groupBy?.[dimension] ?? 'Unknown'
      const current = grouped.get(value) ?? { value, input: 0, output: 0, cached: 0, total: 0, share: 0 }
      current.input += bucket.inputTokens + bucket.cacheCreationTokens
      current.output += bucket.outputTokens
      current.cached += bucket.cachedInputTokens
      current.total += bucket.totalTokens
      grouped.set(value, current)
    })

    return Array.from(grouped.values())
      .map((row) => ({ ...row, share: totalTokens === 0 ? 0 : row.total / totalTokens }))
      .sort((a, b) => {
        const left = a[sortKey]
        const right = b[sortKey]
        const result = typeof left === 'string'
          ? left.localeCompare(String(right))
          : Number(left) - Number(right)
        return sortDir === 'asc' ? result : -result
      })
  }, [buckets, dimension, sortDir, sortKey])

  function updateSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDir((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(nextKey)
    setSortDir(nextKey === 'value' ? 'asc' : 'desc')
  }

  const headers: Array<{ key: SortKey; label: string; align?: string }> = [
    { key: 'value', label: 'Dimension Value' },
    { key: 'input', label: 'Input', align: 'text-right' },
    { key: 'output', label: 'Output', align: 'text-right' },
    { key: 'cached', label: 'Cached', align: 'text-right' },
    { key: 'total', label: 'Total', align: 'text-right' },
    { key: 'share', label: '% Share', align: 'text-right' },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Group Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              {headers.map((header) => (
                <th key={header.key} className={`py-2 font-medium ${header.align ?? 'text-left'}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => updateSort(header.key)}
                  >
                    {header.label}{sortKey === header.key ? (sortDir === 'asc' ? ' asc' : ' desc') : ''}
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.value} className="border-b last:border-0">
                <td className="py-2 font-medium">{row.value}</td>
                <td className="py-2 text-right tabular-nums">{formatTokenCount(row.input)}</td>
                <td className="py-2 text-right tabular-nums">{formatTokenCount(row.output)}</td>
                <td className="py-2 text-right tabular-nums">{formatTokenCount(row.cached)}</td>
                <td className="py-2 text-right tabular-nums">{formatTokenCount(row.total)}</td>
                <td className="py-2 text-right tabular-nums">{formatPercent(row.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
