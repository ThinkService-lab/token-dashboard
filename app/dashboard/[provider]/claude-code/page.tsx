'use client'
import { use, Suspense } from 'react'
import { useFilters } from '@/hooks/useFilters'
import { useClaudeCodeData } from '@/hooks/useClaudeCodeData'
import { Topbar } from '@/components/layout/Topbar'
import { SummaryCard } from '@/components/cards/SummaryCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTokenCount, formatUSD } from '@/lib/formatters'
import type { ClaudeCodeUserBucket } from '@/lib/providers/types'

interface UserRow {
  email: string
  totalTokens: number
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  estimatedCostUsd: number
}

function aggregateByUser(buckets: ClaudeCodeUserBucket[]): UserRow[] {
  const map = new Map<string, UserRow>()
  for (const b of buckets) {
    const existing = map.get(b.userEmail)
    if (existing) {
      existing.totalTokens += b.totalTokens
      existing.inputTokens += b.inputTokens
      existing.outputTokens += b.outputTokens
      existing.cachedInputTokens += b.cachedInputTokens
      existing.estimatedCostUsd += b.estimatedCostUsd
    } else {
      map.set(b.userEmail, {
        email: b.userEmail,
        totalTokens: b.totalTokens,
        inputTokens: b.inputTokens,
        outputTokens: b.outputTokens,
        cachedInputTokens: b.cachedInputTokens,
        estimatedCostUsd: b.estimatedCostUsd,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd)
}

function ClaudeCodeContent({ providerId }: { providerId: string }) {
  const [filters] = useFilters()
  const { data, isLoading, error } = useClaudeCodeData(filters, providerId === 'anthropic')

  if (providerId !== 'anthropic') {
    return (
      <>
        <Topbar title="Claude Code" />
        <div className="p-4">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Claude Code metrics are only available for the Anthropic provider.
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const buckets = data?.buckets ?? []
  const users = aggregateByUser(buckets)
  const totalCost = users.reduce((s, u) => s + u.estimatedCostUsd, 0)
  const totalTokens = users.reduce((s, u) => s + u.totalTokens, 0)
  const activeUsers = users.length

  return (
    <>
      <Topbar title="Claude Code" />
      <div className="p-4 space-y-4">
        {error && (
          <Card>
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <SummaryCard label="Estimated Cost" value={formatUSD(totalCost)} isLoading={isLoading} color="#f59e0b" />
          <SummaryCard label="Total Tokens" value={formatTokenCount(totalTokens)} isLoading={isLoading} color="#6366f1" />
          <SummaryCard label="Active Developers" value={String(activeUsers)} isLoading={isLoading} color="#22d3ee" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Developer Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No Claude Code usage found for this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left px-4 py-2 font-medium">#</th>
                      <th className="text-left px-4 py-2 font-medium">Developer</th>
                      <th className="text-right px-4 py-2 font-medium">Total Tokens</th>
                      <th className="text-right px-4 py-2 font-medium">Input</th>
                      <th className="text-right px-4 py-2 font-medium">Output</th>
                      <th className="text-right px-4 py-2 font-medium">Cached</th>
                      <th className="text-right px-4 py-2 font-medium">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={user.email} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{user.email}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatTokenCount(user.totalTokens)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatTokenCount(user.inputTokens)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatTokenCount(user.outputTokens)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatTokenCount(user.cachedInputTokens)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatUSD(user.estimatedCostUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function ClaudeCodePage({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = use(params)
  return <Suspense><ClaudeCodeContent providerId={provider} /></Suspense>
}
