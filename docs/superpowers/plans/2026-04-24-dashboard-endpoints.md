# Dashboard Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface all available API endpoint data for both Anthropic and OpenAI providers across three phases: type expansion, adapter additions, and UI redesign.

**Architecture:** Incremental by layer — types first so adapters can implement against a stable contract, then route handlers, then hooks, then UI. No test framework exists in the project; use `npx tsc --noEmit` as the verification step after each task. The existing adapter pattern (`ProviderAdapter` interface, `fetchAll`/`fetchAllPages` pagination helpers) is reused for all new endpoints.

**Tech Stack:** Next.js 16 App Router, TypeScript 5.9, Recharts 3, Tailwind CSS 4, shadcn/ui

---

## File Map

**Create:**
- `hooks/useEmbeddingsData.ts`
- `hooks/useImageData.ts`
- `hooks/useAudioData.ts`
- `hooks/useToolUseData.ts`
- `app/api/embeddings/route.ts`
- `app/api/images/route.ts`
- `app/api/audio/route.ts`
- `app/api/tool-use/route.ts`
- `components/charts/GroupByStackedChart.tsx`
- `components/charts/GroupByBreakdownTable.tsx`
- `components/charts/CostBreakdownChart.tsx`

**Modify:**
- `lib/providers/types.ts` — 4 new interfaces, extend `NormalizedCostBucket`, extend `ProviderAdapter`
- `lib/providers/anthropic.ts` — split cost fields, add `fetchToolUseUsage`
- `lib/providers/openai.ts` — direct costs, add 4 new endpoint methods
- `lib/constants.ts` — new color constants
- `app/dashboard/[provider]/usage/page.tsx` — full rewrite
- `app/dashboard/[provider]/costs/page.tsx` — new cards + breakdown chart

---

## Phase 1 — Data Layer

### Task 1: Expand types and constants

**Files:**
- Modify: `lib/providers/types.ts`
- Modify: `lib/constants.ts`

- [ ] **Step 1: Add 4 new normalized interfaces and extend existing types**

Replace the contents of `lib/providers/types.ts` with:

```ts
export interface NormalizedUsageBucket {
  timestamp: string
  inputTokens: number
  cachedInputTokens: number
  cacheCreationTokens: number
  outputTokens: number
  totalTokens: number
  groupBy?: Record<string, string>
}

export interface NormalizedCostBucket {
  timestamp: string
  tokenCostUsd: number
  webSearchCostUsd?: number
  codeExecutionCostUsd?: number
  otherCostsUsd: number
  totalCostUsd: number
  groupBy?: Record<string, string>
}

export interface NormalizedEmbeddingsUsage {
  timestamp: string
  model: string
  inputTokens: number
  requests: number
}

export interface NormalizedImageUsage {
  timestamp: string
  model: string
  size: string
  quality: string
  imagesGenerated: number
}

export interface NormalizedAudioUsage {
  timestamp: string
  model: string
  type: 'speech' | 'transcription'
  seconds: number
  characters: number
}

export interface NormalizedToolUseUsage {
  timestamp: string
  model: string
  inputTokens: number
  outputTokens: number
  requests: number
}

export interface NormalizedUsageData {
  buckets: NormalizedUsageBucket[]
  hasMore: boolean
}

export interface NormalizedCostData {
  buckets: NormalizedCostBucket[]
  hasMore: boolean
}

export interface NormalizedEmbeddingsData {
  buckets: NormalizedEmbeddingsUsage[]
}

export interface NormalizedImageData {
  buckets: NormalizedImageUsage[]
}

export interface NormalizedAudioData {
  buckets: NormalizedAudioUsage[]
}

export interface NormalizedToolUseData {
  buckets: NormalizedToolUseUsage[]
}

export type Granularity = '1min' | '1hr' | '1day'

export type GroupByDimension = 'model' | 'workspace' | 'api_key' | 'service_tier' | 'context_window'

export interface FilterState {
  start?: string
  end?: string
  granularity: Granularity
  groupBy: GroupByDimension[]
}

export interface ModelConfig {
  id: string
  label: string
  inputCostPerMillion: number
  outputCostPerMillion: number
  cacheReadCostPerMillion?: number
  cacheWriteCostPerMillion?: number
}

export interface ClaudeCodeUserBucket {
  timestamp: string
  userEmail: string
  userId: string
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  totalTokens: number
  estimatedCostUsd: number
}

export interface ClaudeCodeData {
  buckets: ClaudeCodeUserBucket[]
  hasMore: boolean
}

export interface ProviderAdapter {
  id: string
  label: string
  color: string
  validateKey(apiKey: string): Promise<boolean>
  fetchUsage(filters: FilterState, apiKey: string): Promise<NormalizedUsageData>
  fetchCosts(filters: FilterState, apiKey: string): Promise<NormalizedCostData>
  fetchClaudeCode?(filters: FilterState, apiKey: string): Promise<ClaudeCodeData>
  fetchEmbeddingsUsage?(filters: FilterState, apiKey: string): Promise<NormalizedEmbeddingsData>
  fetchImageUsage?(filters: FilterState, apiKey: string): Promise<NormalizedImageData>
  fetchAudioUsage?(filters: FilterState, apiKey: string): Promise<NormalizedAudioData>
  fetchToolUseUsage?(filters: FilterState, apiKey: string): Promise<NormalizedToolUseData>
  groupByDimensions: GroupByDimension[]
  models: ModelConfig[]
  adminKeyHint: string
}
```

- [ ] **Step 2: Add new color constants to `lib/constants.ts`**

Append to `lib/constants.ts`:

```ts
export const COST_BREAKDOWN_COLORS = {
  tokenCostUsd: '#6366f1',
  webSearchCostUsd: '#f59e0b',
  codeExecutionCostUsd: '#f87171',
}

export const GROUP_BY_PALETTE = [
  '#6366f1', '#f59e0b', '#22d3ee', '#34d399', '#f87171',
  '#a78bfa', '#fb923c', '#4ade80', '#60a5fa', '#e879f9',
]
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/providers/types.ts lib/constants.ts
git commit -m "feat: expand types for embeddings, images, audio, tool-use and cost breakdown fields"
```

---

### Task 2: Fix Anthropic adapter — split cost fields and add tool_use endpoint

**Files:**
- Modify: `lib/providers/anthropic.ts`

- [ ] **Step 1: Split `web_search` and `code_execution` in `fetchCosts`**

In `lib/providers/anthropic.ts`, replace the `fetchCosts` method body (lines 108–128):

```ts
async fetchCosts(filters, apiKey) {
  const params = buildParams(filters)
  const raw = await fetchAll<Record<string, unknown>>(
    `${BASE}/v1/organizations/cost_report?${params}`,
    apiKey
  )
  const buckets = raw.map((item) => {
    const c = (item.costs as Record<string, number>) ?? {}
    const tokenCost = c.token_usage ?? 0
    const webSearch = c.web_search ?? 0
    const codeExec = c.code_execution ?? 0
    return {
      timestamp: item.timestamp as string,
      tokenCostUsd: tokenCost,
      webSearchCostUsd: webSearch,
      codeExecutionCostUsd: codeExec,
      otherCostsUsd: 0,
      totalCostUsd: tokenCost + webSearch + codeExec,
      groupBy: item.group_by as Record<string, string> | undefined,
    }
  })
  return { buckets, hasMore: false }
},
```

- [ ] **Step 2: Add `fetchToolUseUsage` method**

Add the import for the new types at the top of `lib/providers/anthropic.ts` — replace the existing import block:

```ts
import type {
  ProviderAdapter,
  FilterState,
  NormalizedUsageData,
  NormalizedCostData,
  NormalizedToolUseData,
  ClaudeCodeData,
  ModelConfig,
  GroupByDimension,
} from './types'
```

Then add `fetchToolUseUsage` as the last method on the `anthropicAdapter` object (before the closing `}`):

```ts
async fetchToolUseUsage(filters, apiKey): Promise<NormalizedToolUseData> {
  const params = buildParams(filters)
  const raw = await fetchAll<Record<string, unknown>>(
    `${BASE}/v1/organizations/usage_report/tool_use?${params}`,
    apiKey
  )
  const buckets = raw.map((item) => {
    const m = (item.metrics as Record<string, number>) ?? {}
    const g = (item.group_by as Record<string, string>) ?? {}
    return {
      timestamp: item.timestamp as string,
      model: g.model ?? 'unknown',
      inputTokens: m.input_tokens ?? 0,
      outputTokens: m.output_tokens ?? 0,
      requests: m.num_model_requests ?? 1,
    }
  })
  return { buckets }
},
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/providers/anthropic.ts
git commit -m "feat: split Anthropic cost fields and add tool_use usage endpoint"
```

---

### Task 3: Expand OpenAI adapter — direct costs + 4 new endpoints

**Files:**
- Modify: `lib/providers/openai.ts`

- [ ] **Step 1: Add new type imports and raw bucket interfaces**

Replace the import at the top of `lib/providers/openai.ts`:

```ts
import type {
  ProviderAdapter,
  FilterState,
  NormalizedUsageData,
  NormalizedCostData,
  NormalizedEmbeddingsData,
  NormalizedImageData,
  NormalizedAudioData,
  NormalizedToolUseData,
  ModelConfig,
} from './types'
```

Add raw bucket type declarations after the existing `OpenAICompletionBucket` interface (after line 58):

```ts
interface OpenAIEmbeddingsBucket {
  start_time: number
  results: Array<{
    input_tokens: number
    num_model_requests: number
    model_ids: string[]
  }>
}

interface OpenAIImagesBucket {
  start_time: number
  results: Array<{
    images: number
    num_model_requests: number
    size: string
    quality: string
    model_ids: string[]
  }>
}

interface OpenAIAudioSpeechesBucket {
  start_time: number
  results: Array<{
    characters: number
    num_model_requests: number
    model_ids: string[]
  }>
}

interface OpenAIAudioTranscriptionsBucket {
  start_time: number
  results: Array<{
    seconds: number
    num_model_requests: number
    model_ids: string[]
  }>
}

interface OpenAICodeInterpreterBucket {
  start_time: number
  results: Array<{
    sessions: number
    model_ids: string[]
  }>
}

interface OpenAICostsBucket {
  start_time: number
  results: Array<{
    amount: { value: number; currency: string }
    line_item: string | null
  }>
}
```

- [ ] **Step 2: Switch `fetchCosts` to direct endpoint with pricing fallback**

Replace the `fetchCosts` method in `lib/providers/openai.ts`:

```ts
async fetchCosts(filters: FilterState, apiKey: string): Promise<NormalizedCostData> {
  const now = Math.floor(Date.now() / 1000)
  const startTime = toUnix(filters.start) ?? now - 30 * 86400
  const endTime = toUnix(filters.end) ?? now
  const bucketWidth = granularityToBucketWidth(filters.granularity)

  // Try direct costs endpoint first
  const costsRes = await fetch(
    `${BASE}/v1/organization/costs?start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  )

  if (costsRes.ok) {
    const json: { data?: OpenAICostsBucket[]; has_more?: boolean; next_page?: string } = await costsRes.json()
    const raw = json.data ?? []
    const buckets = raw.map((item) => {
      const total = item.results.reduce((sum, r) => sum + r.amount.value, 0)
      return {
        timestamp: new Date(item.start_time * 1000).toISOString(),
        tokenCostUsd: total,
        otherCostsUsd: 0,
        totalCostUsd: total,
      }
    })
    return { buckets, hasMore: false }
  }

  // Fallback: derive from completions + pricing table (403 or unavailable)
  const raw = await fetchAllPages<OpenAICompletionBucket>(
    `${BASE}/v1/organization/usage/completions?start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}&group_by[]=model`,
    apiKey
  )

  const buckets = raw.map((item) => {
    const tokenCost = item.results.reduce((sum, r) => {
      const modelId = r.model_ids[0]
      const pricing = PRICING[modelId]
      if (!pricing) return sum
      const inputCost = ((r.input_tokens - r.input_cached_tokens) * pricing.inputCostPerMillion) / 1_000_000
      const cachedCost = (r.input_cached_tokens * (pricing.cacheReadCostPerMillion ?? pricing.inputCostPerMillion)) / 1_000_000
      const outputCost = (r.output_tokens * pricing.outputCostPerMillion) / 1_000_000
      return sum + inputCost + cachedCost + outputCost
    }, 0)
    return {
      timestamp: new Date(item.start_time * 1000).toISOString(),
      tokenCostUsd: tokenCost,
      otherCostsUsd: 0,
      totalCostUsd: tokenCost,
    }
  })

  return { buckets, hasMore: false }
},
```

- [ ] **Step 3: Add `fetchEmbeddingsUsage` method**

Add after `fetchCosts` in the `openaiAdapter` object:

```ts
async fetchEmbeddingsUsage(filters: FilterState, apiKey: string): Promise<NormalizedEmbeddingsData> {
  const now = Math.floor(Date.now() / 1000)
  const startTime = toUnix(filters.start) ?? now - 30 * 86400
  const endTime = toUnix(filters.end) ?? now
  const bucketWidth = granularityToBucketWidth(filters.granularity)

  const raw = await fetchAllPages<OpenAIEmbeddingsBucket>(
    `${BASE}/v1/organization/usage/embeddings?start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}&group_by[]=model`,
    apiKey
  )

  const buckets = raw.flatMap((item) =>
    item.results.map((r) => ({
      timestamp: new Date(item.start_time * 1000).toISOString(),
      model: r.model_ids[0] ?? 'unknown',
      inputTokens: r.input_tokens,
      requests: r.num_model_requests,
    }))
  )

  return { buckets }
},
```

- [ ] **Step 4: Add `fetchImageUsage` method**

Add after `fetchEmbeddingsUsage`:

```ts
async fetchImageUsage(filters: FilterState, apiKey: string): Promise<NormalizedImageData> {
  const now = Math.floor(Date.now() / 1000)
  const startTime = toUnix(filters.start) ?? now - 30 * 86400
  const endTime = toUnix(filters.end) ?? now
  const bucketWidth = granularityToBucketWidth(filters.granularity)

  const raw = await fetchAllPages<OpenAIImagesBucket>(
    `${BASE}/v1/organization/usage/images?start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}`,
    apiKey
  )

  const buckets = raw.flatMap((item) =>
    item.results.map((r) => ({
      timestamp: new Date(item.start_time * 1000).toISOString(),
      model: r.model_ids[0] ?? 'unknown',
      size: r.size ?? 'unknown',
      quality: r.quality ?? 'standard',
      imagesGenerated: r.images,
    }))
  )

  return { buckets }
},
```

- [ ] **Step 5: Add `fetchAudioUsage` method**

Add after `fetchImageUsage`:

```ts
async fetchAudioUsage(filters: FilterState, apiKey: string): Promise<NormalizedAudioData> {
  const now = Math.floor(Date.now() / 1000)
  const startTime = toUnix(filters.start) ?? now - 30 * 86400
  const endTime = toUnix(filters.end) ?? now
  const bucketWidth = granularityToBucketWidth(filters.granularity)
  const timeParams = `start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}`

  const [speechRaw, transcriptionRaw] = await Promise.all([
    fetchAllPages<OpenAIAudioSpeechesBucket>(
      `${BASE}/v1/organization/usage/audio_speeches?${timeParams}`,
      apiKey
    ),
    fetchAllPages<OpenAIAudioTranscriptionsBucket>(
      `${BASE}/v1/organization/usage/audio_transcriptions?${timeParams}`,
      apiKey
    ),
  ])

  const speechBuckets = speechRaw.flatMap((item) =>
    item.results.map((r) => ({
      timestamp: new Date(item.start_time * 1000).toISOString(),
      model: r.model_ids[0] ?? 'unknown',
      type: 'speech' as const,
      seconds: 0,
      characters: r.characters,
    }))
  )

  const transcriptionBuckets = transcriptionRaw.flatMap((item) =>
    item.results.map((r) => ({
      timestamp: new Date(item.start_time * 1000).toISOString(),
      model: r.model_ids[0] ?? 'unknown',
      type: 'transcription' as const,
      seconds: r.seconds,
      characters: 0,
    }))
  )

  return { buckets: [...speechBuckets, ...transcriptionBuckets] }
},
```

- [ ] **Step 6: Add `fetchToolUseUsage` method**

Add after `fetchAudioUsage`:

```ts
async fetchToolUseUsage(filters: FilterState, apiKey: string): Promise<NormalizedToolUseData> {
  const now = Math.floor(Date.now() / 1000)
  const startTime = toUnix(filters.start) ?? now - 30 * 86400
  const endTime = toUnix(filters.end) ?? now
  const bucketWidth = granularityToBucketWidth(filters.granularity)

  const raw = await fetchAllPages<OpenAICodeInterpreterBucket>(
    `${BASE}/v1/organization/usage/code_interpreter_sessions?start_time=${startTime}&end_time=${endTime}&bucket_width=${bucketWidth}`,
    apiKey
  )

  const buckets = raw.flatMap((item) =>
    item.results.map((r) => ({
      timestamp: new Date(item.start_time * 1000).toISOString(),
      model: r.model_ids[0] ?? 'unknown',
      inputTokens: 0,
      outputTokens: 0,
      requests: r.sessions,
    }))
  )

  return { buckets }
},
```

- [ ] **Step 7: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/providers/openai.ts
git commit -m "feat: add OpenAI direct costs, embeddings, images, audio, and code interpreter endpoints"
```

---

## Phase 2 — API Routes and Hooks

### Task 4: Add 4 new API route handlers

**Files:**
- Create: `app/api/embeddings/route.ts`
- Create: `app/api/images/route.ts`
- Create: `app/api/audio/route.ts`
- Create: `app/api/tool-use/route.ts`

- [ ] **Step 1: Create embeddings route**

Create `app/api/embeddings/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { providers } from '@/lib/providers'
import type { FilterState, Granularity, GroupByDimension } from '@/lib/providers/types'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const providerId = sp.get('provider') ?? 'openai'
  const adapter = providers[providerId]
  if (!adapter) return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  if (!adapter.fetchEmbeddingsUsage) return NextResponse.json({ buckets: [] })

  const filters: FilterState = {
    start: sp.get('start') ?? undefined,
    end: sp.get('end') ?? undefined,
    granularity: (sp.get('granularity') as Granularity) ?? '1day',
    groupBy: sp.getAll('groupBy') as GroupByDimension[],
  }

  try {
    const data = await adapter.fetchEmbeddingsUsage(filters, apiKey)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create images route**

Create `app/api/images/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { providers } from '@/lib/providers'
import type { FilterState, Granularity, GroupByDimension } from '@/lib/providers/types'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const providerId = sp.get('provider') ?? 'openai'
  const adapter = providers[providerId]
  if (!adapter) return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  if (!adapter.fetchImageUsage) return NextResponse.json({ buckets: [] })

  const filters: FilterState = {
    start: sp.get('start') ?? undefined,
    end: sp.get('end') ?? undefined,
    granularity: (sp.get('granularity') as Granularity) ?? '1day',
    groupBy: sp.getAll('groupBy') as GroupByDimension[],
  }

  try {
    const data = await adapter.fetchImageUsage(filters, apiKey)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create audio route**

Create `app/api/audio/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { providers } from '@/lib/providers'
import type { FilterState, Granularity, GroupByDimension } from '@/lib/providers/types'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const providerId = sp.get('provider') ?? 'openai'
  const adapter = providers[providerId]
  if (!adapter) return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  if (!adapter.fetchAudioUsage) return NextResponse.json({ buckets: [] })

  const filters: FilterState = {
    start: sp.get('start') ?? undefined,
    end: sp.get('end') ?? undefined,
    granularity: (sp.get('granularity') as Granularity) ?? '1day',
    groupBy: sp.getAll('groupBy') as GroupByDimension[],
  }

  try {
    const data = await adapter.fetchAudioUsage(filters, apiKey)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create tool-use route**

Create `app/api/tool-use/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { providers } from '@/lib/providers'
import type { FilterState, Granularity, GroupByDimension } from '@/lib/providers/types'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const providerId = sp.get('provider') ?? 'anthropic'
  const adapter = providers[providerId]
  if (!adapter) return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  if (!adapter.fetchToolUseUsage) return NextResponse.json({ buckets: [] })

  const filters: FilterState = {
    start: sp.get('start') ?? undefined,
    end: sp.get('end') ?? undefined,
    granularity: (sp.get('granularity') as Granularity) ?? '1day',
    groupBy: sp.getAll('groupBy') as GroupByDimension[],
  }

  try {
    const data = await adapter.fetchToolUseUsage(filters, apiKey)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/embeddings/route.ts app/api/images/route.ts app/api/audio/route.ts app/api/tool-use/route.ts
git commit -m "feat: add API route handlers for embeddings, images, audio, and tool-use"
```

---

### Task 5: Add 4 client hooks

**Files:**
- Create: `hooks/useEmbeddingsData.ts`
- Create: `hooks/useImageData.ts`
- Create: `hooks/useAudioData.ts`
- Create: `hooks/useToolUseData.ts`

- [ ] **Step 1: Create `hooks/useEmbeddingsData.ts`**

```ts
'use client'
import { useState, useEffect, useRef } from 'react'
import type { NormalizedEmbeddingsData, FilterState } from '@/lib/providers/types'

export function useEmbeddingsData(providerId: string, apiKey: string | null, filters: FilterState) {
  const [data, setData] = useState<NormalizedEmbeddingsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!apiKey) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({ provider: providerId })
    if (filters.start) params.set('start', filters.start)
    if (filters.end) params.set('end', filters.end)
    params.set('granularity', filters.granularity)

    fetch(`/api/embeddings?${params}`, {
      headers: { 'x-api-key': apiKey },
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error)
        else setData(json)
      })
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => setIsLoading(false))
  }, [providerId, apiKey, filters.start, filters.end, filters.granularity])

  return { data, isLoading, error }
}
```

- [ ] **Step 2: Create `hooks/useImageData.ts`**

```ts
'use client'
import { useState, useEffect, useRef } from 'react'
import type { NormalizedImageData, FilterState } from '@/lib/providers/types'

export function useImageData(providerId: string, apiKey: string | null, filters: FilterState) {
  const [data, setData] = useState<NormalizedImageData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!apiKey) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({ provider: providerId })
    if (filters.start) params.set('start', filters.start)
    if (filters.end) params.set('end', filters.end)
    params.set('granularity', filters.granularity)

    fetch(`/api/images?${params}`, {
      headers: { 'x-api-key': apiKey },
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error)
        else setData(json)
      })
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => setIsLoading(false))
  }, [providerId, apiKey, filters.start, filters.end, filters.granularity])

  return { data, isLoading, error }
}
```

- [ ] **Step 3: Create `hooks/useAudioData.ts`**

```ts
'use client'
import { useState, useEffect, useRef } from 'react'
import type { NormalizedAudioData, FilterState } from '@/lib/providers/types'

export function useAudioData(providerId: string, apiKey: string | null, filters: FilterState) {
  const [data, setData] = useState<NormalizedAudioData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!apiKey) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({ provider: providerId })
    if (filters.start) params.set('start', filters.start)
    if (filters.end) params.set('end', filters.end)
    params.set('granularity', filters.granularity)

    fetch(`/api/audio?${params}`, {
      headers: { 'x-api-key': apiKey },
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error)
        else setData(json)
      })
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => setIsLoading(false))
  }, [providerId, apiKey, filters.start, filters.end, filters.granularity])

  return { data, isLoading, error }
}
```

- [ ] **Step 4: Create `hooks/useToolUseData.ts`**

```ts
'use client'
import { useState, useEffect, useRef } from 'react'
import type { NormalizedToolUseData, FilterState } from '@/lib/providers/types'

export function useToolUseData(providerId: string, apiKey: string | null, filters: FilterState) {
  const [data, setData] = useState<NormalizedToolUseData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!apiKey) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({ provider: providerId })
    if (filters.start) params.set('start', filters.start)
    if (filters.end) params.set('end', filters.end)
    params.set('granularity', filters.granularity)

    fetch(`/api/tool-use?${params}`, {
      headers: { 'x-api-key': apiKey },
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error)
        else setData(json)
      })
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => setIsLoading(false))
  }, [providerId, apiKey, filters.start, filters.end, filters.granularity])

  return { data, isLoading, error }
}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add hooks/useEmbeddingsData.ts hooks/useImageData.ts hooks/useAudioData.ts hooks/useToolUseData.ts
git commit -m "feat: add client hooks for embeddings, images, audio, and tool-use data"
```

---

## Phase 3 — UI Components and Pages

### Task 6: Add GroupByStackedChart component

**Files:**
- Create: `components/charts/GroupByStackedChart.tsx`

The component receives `NormalizedUsageBucket[]` where each bucket may have a `groupBy` field. It pivots the data so each unique dimension value becomes a `<Bar>` series.

- [ ] **Step 1: Create `components/charts/GroupByStackedChart.tsx`**

```tsx
'use client'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'
import { formatDate, formatTokenCount } from '@/lib/formatters'
import { GROUP_BY_PALETTE } from '@/lib/constants'
import type { NormalizedUsageBucket, Granularity, GroupByDimension } from '@/lib/providers/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  buckets: NormalizedUsageBucket[]
  granularity: Granularity
  groupByDimension: GroupByDimension
  isLoading?: boolean
}

export function GroupByStackedChart({ buckets, granularity, groupByDimension, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-4 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-56 w-full" /></CardContent>
      </Card>
    )
  }

  // Collect unique dimension values
  const dimValues = [...new Set(
    buckets.map((b) => b.groupBy?.[groupByDimension] ?? '(none)')
  )]

  // Pivot: group by timestamp, then key by dimension value → total tokens
  const pivotMap = new Map<string, Record<string, number>>()
  for (const b of buckets) {
    const t = formatDate(b.timestamp, granularity)
    const dim = b.groupBy?.[groupByDimension] ?? '(none)'
    const existing = pivotMap.get(t) ?? {}
    existing[dim] = (existing[dim] ?? 0) + b.totalTokens
    pivotMap.set(t, existing)
  }

  const data = Array.from(pivotMap.entries()).map(([t, vals]) => ({ t, ...vals }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Token Usage by {groupByDimension.replace('_', ' ')}
        </CardTitle>
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
            {dimValues.map((dim, i) => (
              <Bar
                key={dim}
                dataKey={dim}
                stackId="a"
                fill={GROUP_BY_PALETTE[i % GROUP_BY_PALETTE.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/charts/GroupByStackedChart.tsx
git commit -m "feat: add GroupByStackedChart component for stacked token visualization"
```

---

### Task 7: Add GroupByBreakdownTable component

**Files:**
- Create: `components/charts/GroupByBreakdownTable.tsx`

- [ ] **Step 1: Create `components/charts/GroupByBreakdownTable.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { formatTokenCount, formatPercent } from '@/lib/formatters'
import type { NormalizedUsageBucket, GroupByDimension } from '@/lib/providers/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Row {
  dimValue: string
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  totalTokens: number
  share: number
}

type SortKey = keyof Omit<Row, 'dimValue'>

interface Props {
  buckets: NormalizedUsageBucket[]
  groupByDimension: GroupByDimension
}

export function GroupByBreakdownTable({ buckets, groupByDimension }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('totalTokens')
  const [sortAsc, setSortAsc] = useState(false)

  const grandTotal = buckets.reduce((s, b) => s + b.totalTokens, 0)

  // Aggregate by dimension value
  const map = new Map<string, Omit<Row, 'share'>>()
  for (const b of buckets) {
    const dim = b.groupBy?.[groupByDimension] ?? '(none)'
    const existing = map.get(dim) ?? { dimValue: dim, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, totalTokens: 0 }
    existing.inputTokens += b.inputTokens
    existing.outputTokens += b.outputTokens
    existing.cachedInputTokens += b.cachedInputTokens
    existing.totalTokens += b.totalTokens
    map.set(dim, existing)
  }

  const rows: Row[] = Array.from(map.values()).map((r) => ({
    ...r,
    share: grandTotal > 0 ? r.totalTokens / grandTotal : 0,
  }))

  rows.sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number)
    return sortAsc ? diff : -diff
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  const th = 'px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Breakdown by {groupByDimension.replace('_', ' ')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className={`${th} text-left`}>{groupByDimension.replace('_', ' ')}</th>
                <th className={`${th} text-right`} onClick={() => toggleSort('inputTokens')}>Input</th>
                <th className={`${th} text-right`} onClick={() => toggleSort('outputTokens')}>Output</th>
                <th className={`${th} text-right`} onClick={() => toggleSort('cachedInputTokens')}>Cached</th>
                <th className={`${th} text-right`} onClick={() => toggleSort('totalTokens')}>Total</th>
                <th className={`${th} text-right`} onClick={() => toggleSort('share')}>% Share</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.dimValue} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2 font-mono text-xs">{row.dimValue}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatTokenCount(row.inputTokens)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatTokenCount(row.outputTokens)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatTokenCount(row.cachedInputTokens)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{formatTokenCount(row.totalTokens)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPercent(row.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/charts/GroupByBreakdownTable.tsx
git commit -m "feat: add GroupByBreakdownTable sortable component"
```

---

### Task 8: Add CostBreakdownChart component

**Files:**
- Create: `components/charts/CostBreakdownChart.tsx`

- [ ] **Step 1: Create `components/charts/CostBreakdownChart.tsx`**

```tsx
'use client'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'
import { formatDate, formatUSD } from '@/lib/formatters'
import { COST_BREAKDOWN_COLORS } from '@/lib/constants'
import type { NormalizedCostBucket, Granularity } from '@/lib/providers/types'
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
        <CardHeader><Skeleton className="h-4 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-56 w-full" /></CardContent>
      </Card>
    )
  }

  const data = buckets.map((b) => ({
    t: formatDate(b.timestamp, granularity),
    token: b.tokenCostUsd,
    webSearch: b.webSearchCostUsd ?? 0,
    codeExec: b.codeExecutionCostUsd ?? 0,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Cost Breakdown by Type</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="t" tick={{ fontSize: 11 }} />
            <YAxis
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tickFormatter={(v: any) => formatUSD(Number(v))}
              tick={{ fontSize: 11 }}
              width={60}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => formatUSD(Number(v))}
              labelStyle={{ fontSize: 11 }}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="token" name="Token Cost" stackId="a" fill={COST_BREAKDOWN_COLORS.tokenCostUsd} />
            <Bar dataKey="webSearch" name="Web Search" stackId="a" fill={COST_BREAKDOWN_COLORS.webSearchCostUsd} />
            <Bar dataKey="codeExec" name="Code Execution" stackId="a" fill={COST_BREAKDOWN_COLORS.codeExecutionCostUsd} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/charts/CostBreakdownChart.tsx
git commit -m "feat: add CostBreakdownChart stacked bar for token/web-search/code-execution costs"
```

---

### Task 9: Rewrite Usage page

**Files:**
- Modify: `app/dashboard/[provider]/usage/page.tsx`

- [ ] **Step 1: Replace `app/dashboard/[provider]/usage/page.tsx`**

```tsx
'use client'
import { use, Suspense, useState } from 'react'
import { useFilters } from '@/hooks/useFilters'
import { useUsageData } from '@/hooks/useUsageData'
import { useEmbeddingsData } from '@/hooks/useEmbeddingsData'
import { useImageData } from '@/hooks/useImageData'
import { useAudioData } from '@/hooks/useAudioData'
import { useToolUseData } from '@/hooks/useToolUseData'
import { useApiKey } from '@/hooks/useApiKey'
import { Topbar } from '@/components/layout/Topbar'
import { SummaryCard } from '@/components/cards/SummaryCard'
import { TokenTrendChart } from '@/components/charts/TokenTrendChart'
import { GroupByStackedChart } from '@/components/charts/GroupByStackedChart'
import { GroupByBreakdownTable } from '@/components/charts/GroupByBreakdownTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { computeTotalTokens, computeCacheHitRate } from '@/lib/cost-calculations'
import { formatTokenCount, formatPercent } from '@/lib/formatters'
import { providers } from '@/lib/providers'
import type { GroupByDimension } from '@/lib/providers/types'

function UsageContent({ providerId }: { providerId: string }) {
  const [filters] = useFilters()
  const { apiKey } = useApiKey(providerId)
  const provider = providers[providerId]

  const { data: usageData, isLoading: usageLoading } = useUsageData(providerId, apiKey, filters)
  const { data: embeddingsData, isLoading: embLoading } = useEmbeddingsData(providerId, apiKey, filters)
  const { data: imageData, isLoading: imgLoading } = useImageData(providerId, apiKey, filters)
  const { data: audioData, isLoading: audLoading } = useAudioData(providerId, apiKey, filters)
  const { data: toolUseData, isLoading: toolLoading } = useToolUseData(providerId, apiKey, filters)

  const completionBuckets = usageData?.buckets ?? []
  const embBuckets = embeddingsData?.buckets ?? []
  const imgBuckets = imageData?.buckets ?? []
  const audBuckets = audioData?.buckets ?? []
  const toolBuckets = toolUseData?.buckets ?? []

  const activeGroupBy = filters.groupBy[0] as GroupByDimension | undefined
  const hasGroupBy = !!activeGroupBy

  const totalCompletionTokens = computeTotalTokens(completionBuckets)
  const totalEmbeddingTokens = embBuckets.reduce((s, b) => s + b.inputTokens, 0)
  const totalImages = imgBuckets.reduce((s, b) => s + b.imagesGenerated, 0)
  const totalAudioSeconds = audBuckets.filter((b) => b.type === 'transcription').reduce((s, b) => s + b.seconds, 0)
  const totalToolRequests = toolBuckets.reduce((s, b) => s + b.requests, 0)

  return (
    <>
      <Topbar title="Token Usage" availableGroupBy={provider?.groupByDimensions} />
      <div className="p-4 space-y-6">

        {/* Summary cards strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <SummaryCard label="Completions" value={formatTokenCount(totalCompletionTokens)} isLoading={usageLoading} color="#6366f1" />
          <SummaryCard
            label="Embeddings"
            value={providerId === 'openai' ? formatTokenCount(totalEmbeddingTokens) : '—'}
            isLoading={embLoading && providerId === 'openai'}
            color="#22d3ee"
          />
          <SummaryCard
            label="Images"
            value={providerId === 'openai' ? String(totalImages) : '—'}
            isLoading={imgLoading && providerId === 'openai'}
            color="#f59e0b"
          />
          <SummaryCard
            label="Audio (sec)"
            value={providerId === 'openai' ? String(Math.round(totalAudioSeconds)) : '—'}
            isLoading={audLoading && providerId === 'openai'}
            color="#34d399"
          />
          <SummaryCard
            label="Tool Use"
            value={providerId === 'anthropic' ? String(totalToolRequests) : '—'}
            isLoading={toolLoading && providerId === 'anthropic'}
            color="#f87171"
          />
        </div>

        {/* Completions drill-down */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Completions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="Total Tokens" value={formatTokenCount(totalCompletionTokens)} isLoading={usageLoading} />
            <SummaryCard label="Input" value={formatTokenCount(completionBuckets.reduce((s, b) => s + b.inputTokens, 0))} isLoading={usageLoading} color="#6366f1" />
            <SummaryCard label="Output" value={formatTokenCount(completionBuckets.reduce((s, b) => s + b.outputTokens, 0))} isLoading={usageLoading} color="#f59e0b" />
            <SummaryCard label="Cache Hit Rate" value={formatPercent(computeCacheHitRate(completionBuckets))} isLoading={usageLoading} color="#22d3ee" />
          </div>
          {hasGroupBy && activeGroupBy ? (
            <>
              <GroupByStackedChart buckets={completionBuckets} granularity={filters.granularity} groupByDimension={activeGroupBy} isLoading={usageLoading} />
              <GroupByBreakdownTable buckets={completionBuckets} groupByDimension={activeGroupBy} />
            </>
          ) : (
            <TokenTrendChart buckets={completionBuckets} granularity={filters.granularity} isLoading={usageLoading} />
          )}
        </section>

        {/* Embeddings drill-down — OpenAI only */}
        {providerId === 'openai' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Embeddings</h2>
            {embLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : embBuckets.length === 0 ? (
              <Card><CardContent className="p-4 text-sm text-muted-foreground">No embeddings usage in this period.</CardContent></Card>
            ) : (
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Embeddings by Model</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left px-3 py-2 font-medium">Model</th>
                          <th className="text-right px-3 py-2 font-medium">Requests</th>
                          <th className="text-right px-3 py-2 font-medium">Input Tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(
                          embBuckets.reduce<Record<string, { requests: number; tokens: number }>>((acc, b) => {
                            acc[b.model] = acc[b.model] ?? { requests: 0, tokens: 0 }
                            acc[b.model].requests += b.requests
                            acc[b.model].tokens += b.inputTokens
                            return acc
                          }, {})
                        )
                          .sort((a, b) => b[1].tokens - a[1].tokens)
                          .map(([model, stats]) => (
                            <tr key={model} className="border-b last:border-0 hover:bg-muted/40">
                              <td className="px-3 py-2 font-mono text-xs">{model}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{stats.requests.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{formatTokenCount(stats.tokens)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* Images drill-down — OpenAI only */}
        {providerId === 'openai' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Images</h2>
            {imgLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : imgBuckets.length === 0 ? (
              <Card><CardContent className="p-4 text-sm text-muted-foreground">No image generation usage in this period.</CardContent></Card>
            ) : (
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Images by Model / Size</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left px-3 py-2 font-medium">Model</th>
                          <th className="text-left px-3 py-2 font-medium">Size</th>
                          <th className="text-left px-3 py-2 font-medium">Quality</th>
                          <th className="text-right px-3 py-2 font-medium">Images</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(
                          imgBuckets.reduce<Record<string, { images: number }>>((acc, b) => {
                            const key = `${b.model}||${b.size}||${b.quality}`
                            acc[key] = acc[key] ?? { images: 0 }
                            acc[key].images += b.imagesGenerated
                            return acc
                          }, {})
                        )
                          .sort((a, b) => b[1].images - a[1].images)
                          .map(([key, stats]) => {
                            const [model, size, quality] = key.split('||')
                            return (
                              <tr key={key} className="border-b last:border-0 hover:bg-muted/40">
                                <td className="px-3 py-2 font-mono text-xs">{model}</td>
                                <td className="px-3 py-2 text-xs">{size}</td>
                                <td className="px-3 py-2 text-xs">{quality}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{stats.images.toLocaleString()}</td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* Audio drill-down — OpenAI only */}
        {providerId === 'openai' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Audio</h2>
            {audLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : audBuckets.length === 0 ? (
              <Card><CardContent className="p-4 text-sm text-muted-foreground">No audio usage in this period.</CardContent></Card>
            ) : (
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Audio by Type / Model</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left px-3 py-2 font-medium">Model</th>
                          <th className="text-left px-3 py-2 font-medium">Type</th>
                          <th className="text-right px-3 py-2 font-medium">Seconds</th>
                          <th className="text-right px-3 py-2 font-medium">Characters</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(
                          audBuckets.reduce<Record<string, { seconds: number; characters: number; type: string }>>((acc, b) => {
                            const key = `${b.model}||${b.type}`
                            acc[key] = acc[key] ?? { seconds: 0, characters: 0, type: b.type }
                            acc[key].seconds += b.seconds
                            acc[key].characters += b.characters
                            return acc
                          }, {})
                        )
                          .sort((a, b) => (b[1].seconds + b[1].characters) - (a[1].seconds + a[1].characters))
                          .map(([key, stats]) => {
                            const [model] = key.split('||')
                            return (
                              <tr key={key} className="border-b last:border-0 hover:bg-muted/40">
                                <td className="px-3 py-2 font-mono text-xs">{model}</td>
                                <td className="px-3 py-2 text-xs capitalize">{stats.type}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{Math.round(stats.seconds).toLocaleString()}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{stats.characters.toLocaleString()}</td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* Tool Use drill-down — Anthropic only */}
        {providerId === 'anthropic' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tool Use</h2>
            {toolLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : toolBuckets.length === 0 ? (
              <Card><CardContent className="p-4 text-sm text-muted-foreground">No tool use in this period.</CardContent></Card>
            ) : (
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Tool Use by Model</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left px-3 py-2 font-medium">Model</th>
                          <th className="text-right px-3 py-2 font-medium">Requests</th>
                          <th className="text-right px-3 py-2 font-medium">Input Tokens</th>
                          <th className="text-right px-3 py-2 font-medium">Output Tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(
                          toolBuckets.reduce<Record<string, { requests: number; input: number; output: number }>>((acc, b) => {
                            acc[b.model] = acc[b.model] ?? { requests: 0, input: 0, output: 0 }
                            acc[b.model].requests += b.requests
                            acc[b.model].input += b.inputTokens
                            acc[b.model].output += b.outputTokens
                            return acc
                          }, {})
                        )
                          .sort((a, b) => b[1].requests - a[1].requests)
                          .map(([model, stats]) => (
                            <tr key={model} className="border-b last:border-0 hover:bg-muted/40">
                              <td className="px-3 py-2 font-mono text-xs">{model}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{stats.requests.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{formatTokenCount(stats.input)}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{formatTokenCount(stats.output)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        )}

      </div>
    </>
  )
}

export default function UsagePage({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = use(params)
  return <Suspense><UsageContent providerId={provider} /></Suspense>
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/[provider]/usage/page.tsx
git commit -m "feat: rewrite Usage page with summary cards, GroupBy stacked chart, and per-type drill-down sections"
```

---

### Task 10: Update Costs page

**Files:**
- Modify: `app/dashboard/[provider]/costs/page.tsx`

- [ ] **Step 1: Replace `app/dashboard/[provider]/costs/page.tsx`**

```tsx
'use client'
import { use, Suspense } from 'react'
import { useFilters } from '@/hooks/useFilters'
import { useCostData } from '@/hooks/useCostData'
import { useApiKey } from '@/hooks/useApiKey'
import { Topbar } from '@/components/layout/Topbar'
import { SummaryCard } from '@/components/cards/SummaryCard'
import { CostTrendChart } from '@/components/charts/CostTrendChart'
import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart'
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
  const webSearchCost = buckets.reduce((s, b) => s + (b.webSearchCostUsd ?? 0), 0)
  const codeExecCost = buckets.reduce((s, b) => s + (b.codeExecutionCostUsd ?? 0), 0)
  const otherCost = buckets.reduce((s, b) => s + b.otherCostsUsd, 0)

  const isAnthropic = providerId === 'anthropic'
  const hasBreakdown = isAnthropic && (webSearchCost > 0 || codeExecCost > 0)

  return (
    <>
      <Topbar title="Cost Breakdown" availableGroupBy={provider?.groupByDimensions} />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Total Cost" value={formatUSD(totalCost)} sparkline={sparklineFromBuckets(buckets)} isLoading={isLoading} color="#f59e0b" />
          <SummaryCard label="Avg Daily Cost" value={formatUSD(avgDaily)} isLoading={isLoading} color="#6366f1" />
          <SummaryCard label="Token Costs" value={formatUSD(tokenCost)} isLoading={isLoading} color="#6366f1" />
          {isAnthropic ? (
            <>
              <SummaryCard label="Web Search" value={formatUSD(webSearchCost)} isLoading={isLoading} color="#f59e0b" />
              <SummaryCard label="Code Execution" value={formatUSD(codeExecCost)} isLoading={isLoading} color="#f87171" />
            </>
          ) : (
            <SummaryCard label="Other Costs" value={formatUSD(otherCost)} isLoading={isLoading} color="#f87171" />
          )}
        </div>
        <CostTrendChart buckets={buckets} granularity={filters.granularity} isLoading={isLoading} />
        {(isAnthropic) && (
          <CostBreakdownChart buckets={buckets} granularity={filters.granularity} isLoading={isLoading} />
        )}
      </div>
    </>
  )
}

export default function CostsPage({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = use(params)
  return <Suspense><CostsContent providerId={provider} /></Suspense>
}
```

- [ ] **Step 2: Verify types and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: no type errors, successful build.

- [ ] **Step 3: Start dev server and manually verify**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:
1. Usage page shows 5 summary cards at top (Completions, Embeddings, Images, Audio, Tool Use)
2. Selecting a GroupBy dimension in the filter bar switches the Completions chart to stacked bars and shows the breakdown table below
3. OpenAI provider shows Embeddings / Images / Audio sections (empty states are acceptable if no API key)
4. Anthropic provider shows Tool Use section
5. Costs page shows Web Search and Code Execution cards on Anthropic provider
6. Costs page shows CostBreakdownChart stacked bar on Anthropic provider

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/[provider]/costs/page.tsx
git commit -m "feat: update Costs page with web-search/code-execution breakdown cards and stacked cost chart"
```
