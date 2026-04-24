# Dashboard Endpoints Design

**Date:** 2026-04-24  
**Scope:** Surface all available API endpoint data for both Anthropic and OpenAI providers  
**Approach:** Incremental by layer — types → adapters → UI

---

## Goals

1. Surface hidden data already fetched but not shown (Anthropic cost breakdown, cache creation tokens)
2. Add missing endpoint calls for both providers (Anthropic tool_use; OpenAI embeddings, images, audio, vector stores, direct costs)
3. Redesign the Usage page to show all data types with summary cards + drill-down sections
4. Fix the Costs page to surface web_search vs code_execution cost breakdown
5. Add GroupBy stacked chart + breakdown table to the Completions section

---

## Phase 1: Data Layer

### New Types (`lib/providers/types.ts`)

Four new normalized bucket types:

```ts
interface NormalizedEmbeddingsUsage {
  date: string
  model: string
  inputTokens: number
  requests: number
}

interface NormalizedImageUsage {
  date: string
  model: string
  size: string
  quality: string
  imagesGenerated: number
}

interface NormalizedAudioUsage {
  date: string
  model: string
  type: 'speech' | 'transcription'
  seconds: number
  characters: number
}

interface NormalizedToolUseUsage {
  date: string
  model: string
  inputTokens: number
  outputTokens: number
  requests: number
}
```

### Existing Type Changes

**`NormalizedCostBucket`** — add two new optional fields:
```ts
webSearchCostUsd?: number
codeExecutionCostUsd?: number
```
`otherCostsUsd` is kept for unknown/future cost types but no longer includes web search or code execution on Anthropic.

**`NormalizedUsageBucket`** — verify `cachedInputTokens` maps correctly to Anthropic's `cache_read_input_tokens`; add `cacheCreationInputTokens` as a separate field mapping to `cache_creation_input_tokens`.

### Provider Adapter Interface

Four new optional methods added to `ProviderAdapter`:

```ts
fetchEmbeddingsUsage?(apiKey: string, filters: FilterState): Promise<NormalizedEmbeddingsUsage[]>
fetchImageUsage?(apiKey: string, filters: FilterState): Promise<NormalizedImageUsage[]>
fetchAudioUsage?(apiKey: string, filters: FilterState): Promise<NormalizedAudioUsage[]>
fetchToolUseUsage?(apiKey: string, filters: FilterState): Promise<NormalizedToolUseUsage[]>
```

Methods are optional so existing provider implementations remain valid without changes.

### Anthropic Adapter Changes (`lib/providers/anthropic.ts`)

- **`fetchCosts`**: split `web_search` and `code_execution` line items into `webSearchCostUsd` and `codeExecutionCostUsd` instead of merging both into `otherCostsUsd`
- **`fetchToolUseUsage`**: new method calling `POST /v1/usage_report/tool_use` with the same date-range + groupBy pagination pattern used by `fetchUsage`

### OpenAI Adapter Changes (`lib/providers/openai.ts`)

- **`fetchEmbeddingsUsage`**: `GET /v1/organization/usage/embeddings`
- **`fetchImageUsage`**: `GET /v1/organization/usage/images`
- **`fetchAudioUsage`**: two calls merged — `GET /v1/organization/usage/audio_speeches` + `GET /v1/organization/usage/audio_transcriptions`
- **`fetchToolUseUsage`**: `GET /v1/organization/usage/code_interpreter_sessions`
- **`fetchCosts`**: switch to `GET /v1/organization/costs` for direct cost data; keep existing pricing-table derivation as a fallback when the endpoint returns 403

### New API Routes

Each new data type needs a Next.js route handler following the existing pattern at `app/api/[provider]/usage/route.ts`:

- `app/api/[provider]/embeddings/route.ts`
- `app/api/[provider]/images/route.ts`
- `app/api/[provider]/audio/route.ts`
- `app/api/[provider]/tool-use/route.ts`

Existing `app/api/[provider]/costs/route.ts` updated to forward `webSearchCostUsd` and `codeExecutionCostUsd` fields.

---

## Phase 2: Usage Page Redesign

### Layout (`app/dashboard/[provider]/usage/page.tsx`)

One page, no new routes or sidebar items.

**Summary Cards Strip (top)**

Always-visible row of headline cards, one per data type. Cards with no data render greyed-out with "—" (not hidden).

| Card | Headline | Shown on |
|------|----------|----------|
| Completions | Total tokens | Both |
| Embeddings | Total input tokens | OpenAI |
| Images | Images generated | OpenAI |
| Audio | Total seconds | OpenAI |
| Tool Use | Total requests | Anthropic |

**Completions Drill-Down Section**

- Token trend chart
  - No GroupBy active: line chart (current behavior)
  - GroupBy active: stacked bar chart — one segment per dimension value (model, workspace, api_key, service_tier, or context_window)
- GroupBy breakdown table (appears below chart only when GroupBy is active)
  - Columns: Dimension Value / Input / Output / Cached / Total / % Share
  - Sortable by any column
- GroupBy selector remains in the existing `FilterBar` in `Topbar` — no new UI chrome

**Per-Type Drill-Down Sections**

Collapsible cards, default open, rendered below the Completions section:

- **Embeddings**: requests-over-time line chart + model breakdown table (model, requests, tokens, % share)
- **Images**: images-generated bar chart + model/size/quality breakdown table
- **Audio**: seconds-over-time bar chart + speech vs transcription split, model breakdown table
- **Tool Use**: requests-over-time line chart + model breakdown table (Anthropic only; not rendered on OpenAI)

### New Client Hooks

Four hooks mirroring the existing `useUsageData` pattern (60 s auto-refresh, AbortController):

```
hooks/useEmbeddingsData.ts
hooks/useImageData.ts
hooks/useAudioData.ts
hooks/useToolUseData.ts
```

### New Chart Components

- **`GroupByStackedChart`** (`components/charts/GroupByStackedChart.tsx`): Recharts `BarChart` with one `Bar` per dimension value, color-mapped from a fixed palette
- **`GroupByBreakdownTable`** (`components/charts/GroupByBreakdownTable.tsx`): sortable table component

---

## Phase 3: Costs Page Fix

### Summary Cards (`app/dashboard/[provider]/costs/page.tsx`)

Anthropic provider:
- Remove "Other Cost" card
- Add "Web Search Cost" card (from `webSearchCostUsd`)
- Add "Code Execution Cost" card (from `codeExecutionCostUsd`)

OpenAI provider: no change to card layout.

### Cost Breakdown Chart (Anthropic only)

New `CostBreakdownChart` component (`components/charts/CostBreakdownChart.tsx`):
- Recharts stacked `BarChart`
- Three series per day: Token Cost / Web Search Cost / Code Execution Cost
- Rendered below the existing `CostTrendChart` on Anthropic; not rendered on OpenAI

---

## Build Sequence

1. Expand `types.ts` — new interfaces, updated existing interfaces
2. Update Anthropic adapter — cost split + tool_use endpoint
3. Update OpenAI adapter — all 5 new endpoints + direct costs
4. Add 4 new API route handlers + update costs route
5. Add 4 new client hooks
6. Add `GroupByStackedChart` and `GroupByBreakdownTable` components
7. Add `CostBreakdownChart` component
8. Rewrite `usage/page.tsx` — summary cards + all drill-down sections
9. Update `costs/page.tsx` — new cards + breakdown chart

---

## Out of Scope

- New sidebar pages or routes
- Notifications or alerting
- Data export / CSV download
- Caching layer or server-side state
- Changes to the Overview page
- Changes to the Claude Code page
