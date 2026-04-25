'use client'
import { use, Suspense } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { useFilters } from '@/hooks/useFilters'
import { useUsageData } from '@/hooks/useUsageData'
import { useEmbeddingsData } from '@/hooks/useEmbeddingsData'
import { useImageData } from '@/hooks/useImageData'
import { useAudioData } from '@/hooks/useAudioData'
import { useToolUseData } from '@/hooks/useToolUseData'
import { Topbar } from '@/components/layout/Topbar'
import { SummaryCard } from '@/components/cards/SummaryCard'
import { TokenTrendChart } from '@/components/charts/TokenTrendChart'
import { TokenBreakdownChart } from '@/components/charts/TokenBreakdownChart'
import { GroupByStackedChart } from '@/components/charts/GroupByStackedChart'
import { GroupByBreakdownTable } from '@/components/charts/GroupByBreakdownTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computeTotalTokens, computeCacheHitRate, tokenSparkline } from '@/lib/cost-calculations'
import { formatTokenCount, formatPercent, formatDate } from '@/lib/formatters'
import { providers } from '@/lib/providers'
import type {
  Granularity,
  NormalizedAudioUsage,
  NormalizedEmbeddingsUsage,
  NormalizedImageUsage,
  NormalizedToolUseUsage,
} from '@/lib/providers/types'

type MetricKind = 'tokens' | 'count' | 'seconds'

function formatMetric(value: number, kind: MetricKind) {
  if (kind === 'tokens') return formatTokenCount(value)
  if (kind === 'seconds') return `${Math.round(value).toLocaleString()}s`
  return value.toLocaleString()
}

function aggregateByTimestamp<T>(
  buckets: T[],
  granularity: Granularity,
  getTimestamp: (bucket: T) => string,
  getValue: (bucket: T) => number
) {
  const rows = new Map<string, { t: string; value: number }>()
  buckets.forEach((bucket) => {
    const label = formatDate(getTimestamp(bucket), granularity)
    const row = rows.get(label) ?? { t: label, value: 0 }
    row.value += getValue(bucket)
    rows.set(label, row)
  })
  return Array.from(rows.values())
}

function aggregateRows<T>(
  buckets: T[],
  getLabel: (bucket: T) => string,
  getPrimary: (bucket: T) => number,
  getSecondary?: (bucket: T) => number
) {
  const total = buckets.reduce((sum, bucket) => sum + getPrimary(bucket), 0)
  const rows = new Map<string, { label: string; primary: number; secondary: number; share: number }>()

  buckets.forEach((bucket) => {
    const label = getLabel(bucket)
    const row = rows.get(label) ?? { label, primary: 0, secondary: 0, share: 0 }
    row.primary += getPrimary(bucket)
    row.secondary += getSecondary?.(bucket) ?? 0
    rows.set(label, row)
  })

  return Array.from(rows.values())
    .map((row) => ({ ...row, share: total === 0 ? 0 : row.primary / total }))
    .sort((a, b) => b.primary - a.primary)
}

function MetricTrendCard({
  title,
  data,
  kind,
  chart = 'bar',
}: {
  title: string
  data: Array<{ t: string; value: number }>
  kind: MetricKind
  chart?: 'bar' | 'line'
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          {chart === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="t" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => formatMetric(Number(value), kind)} tick={{ fontSize: 11 }} width={58} />
              <Tooltip formatter={(value: unknown) => formatMetric(Number(value), kind)} />
              <Line type="monotone" dataKey="value" name={title} stroke="#6366f1" dot={false} strokeWidth={2} />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="t" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => formatMetric(Number(value), kind)} tick={{ fontSize: 11 }} width={58} />
              <Tooltip formatter={(value: unknown) => formatMetric(Number(value), kind)} />
              <Bar dataKey="value" name={title} fill="#6366f1" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function BreakdownTable({
  title,
  primaryLabel,
  secondaryLabel,
  rows,
  kind,
  secondaryKind = 'count',
}: {
  title: string
  primaryLabel: string
  secondaryLabel?: string
  rows: Array<{ label: string; primary: number; secondary: number; share: number }>
  kind: MetricKind
  secondaryKind?: MetricKind
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 text-left font-medium">Group</th>
              <th className="py-2 text-right font-medium">{primaryLabel}</th>
              {secondaryLabel && <th className="py-2 text-right font-medium">{secondaryLabel}</th>}
              <th className="py-2 text-right font-medium">% Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="py-4 text-muted-foreground" colSpan={secondaryLabel ? 4 : 3}>No data for this period.</td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.label} className="border-b last:border-0">
                <td className="py-2 font-medium">{row.label}</td>
                <td className="py-2 text-right tabular-nums">{formatMetric(row.primary, kind)}</td>
                {secondaryLabel && (
                  <td className="py-2 text-right tabular-nums">{formatMetric(row.secondary, secondaryKind)}</td>
                )}
                <td className="py-2 text-right tabular-nums">{formatPercent(row.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function UsageContent({ providerId }: { providerId: string }) {
  const [filters] = useFilters()
  const { data: usageData, isLoading: usageLoading } = useUsageData(providerId, filters)
  const { data: embeddingsData, isLoading: embeddingsLoading } = useEmbeddingsData(providerId, filters)
  const { data: imageData, isLoading: imageLoading } = useImageData(providerId, filters)
  const { data: audioData, isLoading: audioLoading } = useAudioData(providerId, filters)
  const { data: toolUseData, isLoading: toolUseLoading } = useToolUseData(providerId, filters)
  const provider = providers[providerId]

  const buckets = usageData?.buckets ?? []
  const embeddings = embeddingsData?.buckets ?? []
  const images = imageData?.buckets ?? []
  const audio = audioData?.buckets ?? []
  const toolUse = toolUseData?.buckets ?? []
  const groupByDimension = filters.groupBy[0]

  const totalInput = buckets.reduce((sum, bucket) => sum + bucket.inputTokens, 0)
  const totalOutput = buckets.reduce((sum, bucket) => sum + bucket.outputTokens, 0)
  const totalCached = buckets.reduce((sum, bucket) => sum + bucket.cachedInputTokens, 0)
  const totalCacheCreate = buckets.reduce((sum, bucket) => sum + bucket.cacheCreationTokens, 0)
  const embeddingsTokens = embeddings.reduce((sum, bucket) => sum + bucket.inputTokens, 0)
  const imagesGenerated = images.reduce((sum, bucket) => sum + bucket.imagesGenerated, 0)
  const audioSeconds = audio.reduce((sum, bucket) => sum + bucket.seconds, 0)
  const toolRequests = toolUse.reduce((sum, bucket) => sum + bucket.requests, 0)
  const cacheHit = computeCacheHitRate(buckets)

  const embeddingsTrend = aggregateByTimestamp(embeddings, filters.granularity, (bucket) => bucket.timestamp, (bucket) => bucket.requests)
  const imageTrend = aggregateByTimestamp(images, filters.granularity, (bucket) => bucket.timestamp, (bucket) => bucket.imagesGenerated)
  const audioTrend = aggregateByTimestamp(audio, filters.granularity, (bucket) => bucket.timestamp, (bucket) => bucket.seconds)
  const toolUseTrend = aggregateByTimestamp(toolUse, filters.granularity, (bucket) => bucket.timestamp, (bucket) => bucket.requests)

  return (
    <>
      <Topbar title="Token Usage" availableGroupBy={provider?.groupByDimensions} />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
          <SummaryCard label="Completions" value={formatTokenCount(computeTotalTokens(buckets))} sparkline={tokenSparkline(buckets)} isLoading={usageLoading} />
          <SummaryCard label="Embeddings" value={embeddings.length ? formatTokenCount(embeddingsTokens) : '-'} isLoading={embeddingsLoading} color="#34d399" />
          <SummaryCard label="Images" value={images.length ? imagesGenerated.toLocaleString() : '-'} isLoading={imageLoading} color="#f59e0b" />
          <SummaryCard label="Audio" value={audio.length ? `${Math.round(audioSeconds).toLocaleString()}s` : '-'} isLoading={audioLoading} color="#22d3ee" />
          <SummaryCard label="Tool Use" value={toolUse.length ? toolRequests.toLocaleString() : '-'} isLoading={toolUseLoading} color="#a78bfa" />
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Completions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="Input Tokens" value={formatTokenCount(totalInput)} isLoading={usageLoading} color="#6366f1" />
            <SummaryCard label="Output Tokens" value={formatTokenCount(totalOutput)} isLoading={usageLoading} color="#f59e0b" />
            <SummaryCard label="Cached Input" value={formatTokenCount(totalCached)} isLoading={usageLoading} color="#22d3ee" />
            <SummaryCard label="Cache Writes" value={formatTokenCount(totalCacheCreate)} isLoading={usageLoading} color="#a78bfa" />
          </div>
          {groupByDimension ? (
            <>
              <GroupByStackedChart buckets={buckets} dimension={groupByDimension} granularity={filters.granularity} isLoading={usageLoading} />
              <GroupByBreakdownTable buckets={buckets} dimension={groupByDimension} />
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TokenTrendChart buckets={buckets} granularity={filters.granularity} isLoading={usageLoading} />
              <TokenBreakdownChart buckets={buckets} granularity={filters.granularity} isLoading={usageLoading} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Cache Hit Rate" value={formatPercent(cacheHit)} isLoading={usageLoading} color="#22d3ee" />
            <SummaryCard label="Cache Savings Est." value={`${formatPercent(cacheHit)} cheaper`} isLoading={usageLoading} color="#34d399" />
          </div>
        </section>

        <details open className="space-y-3">
          <summary className="cursor-pointer text-sm font-semibold">Embeddings</summary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3">
            <MetricTrendCard title="Embedding Requests" data={embeddingsTrend} kind="count" chart="line" />
            <BreakdownTable
              title="Embedding Model Breakdown"
              primaryLabel="Tokens"
              secondaryLabel="Requests"
              rows={aggregateRows<NormalizedEmbeddingsUsage>(embeddings, (bucket) => bucket.model, (bucket) => bucket.inputTokens, (bucket) => bucket.requests)}
              kind="tokens"
            />
          </div>
        </details>

        <details open className="space-y-3">
          <summary className="cursor-pointer text-sm font-semibold">Images</summary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3">
            <MetricTrendCard title="Images Generated" data={imageTrend} kind="count" />
            <BreakdownTable
              title="Image Breakdown"
              primaryLabel="Images"
              rows={aggregateRows<NormalizedImageUsage>(images, (bucket) => `${bucket.model} / ${bucket.size} / ${bucket.quality}`, (bucket) => bucket.imagesGenerated)}
              kind="count"
            />
          </div>
        </details>

        <details open className="space-y-3">
          <summary className="cursor-pointer text-sm font-semibold">Audio</summary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3">
            <MetricTrendCard title="Audio Seconds" data={audioTrend} kind="seconds" />
            <BreakdownTable
              title="Audio Type and Model Breakdown"
              primaryLabel="Seconds"
              secondaryLabel="Characters"
              rows={aggregateRows<NormalizedAudioUsage>(audio, (bucket) => `${bucket.type} / ${bucket.model}`, (bucket) => bucket.seconds, (bucket) => bucket.characters)}
              kind="seconds"
            />
          </div>
        </details>

        {providerId === 'anthropic' && (
          <details open className="space-y-3">
            <summary className="cursor-pointer text-sm font-semibold">Tool Use</summary>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3">
              <MetricTrendCard title="Tool Use Requests" data={toolUseTrend} kind="count" chart="line" />
              <BreakdownTable
                title="Tool Use Model Breakdown"
                primaryLabel="Requests"
                secondaryLabel="Tokens"
                rows={aggregateRows<NormalizedToolUseUsage>(
                  toolUse,
                  (bucket) => bucket.model,
                  (bucket) => bucket.requests,
                  (bucket) => bucket.inputTokens + bucket.outputTokens
                )}
                kind="count"
                secondaryKind="tokens"
              />
            </div>
          </details>
        )}
      </div>
    </>
  )
}

export default function UsagePage({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = use(params)
  return <Suspense><UsageContent providerId={provider} /></Suspense>
}
