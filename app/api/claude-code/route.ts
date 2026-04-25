import { NextRequest, NextResponse } from 'next/server'
import { providers } from '@/lib/providers'
import { getProviderRequestContext } from '@/lib/server/api-route-utils'
import { requireProviderApiKey } from '@/lib/server/provider-keys'

export async function GET(req: NextRequest) {
  try {
    const { providerId, filters } = getProviderRequestContext(req, 'anthropic')
    const adapter = providers[providerId]
    if (!adapter) return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    if (!adapter.fetchClaudeCode) return NextResponse.json({ error: 'Provider does not support Claude Code metrics' }, { status: 400 })
    const apiKey = requireProviderApiKey(providerId)

    const data = await adapter.fetchClaudeCode(filters, apiKey)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: message.startsWith('Missing ') ? 401 : 500 })
  }
}
