import 'server-only'
import type { NextRequest } from 'next/server'
import type { FilterState, Granularity, GroupByDimension } from '@/lib/providers/types'

export function getProviderRequestContext(req: NextRequest, fallbackProvider: string) {
  const sp = req.nextUrl.searchParams
  const providerId = sp.get('provider') ?? fallbackProvider

  const filters: FilterState = {
    start: sp.get('start') ?? undefined,
    end: sp.get('end') ?? undefined,
    granularity: (sp.get('granularity') as Granularity) ?? '1day',
    groupBy: sp.getAll('groupBy') as GroupByDimension[],
  }

  return {
    providerId,
    filters,
  }
}
