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
