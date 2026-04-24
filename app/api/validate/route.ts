import { NextRequest, NextResponse } from 'next/server'
import { providers } from '@/lib/providers'

export async function POST(req: NextRequest) {
  const { providerId, apiKey } = await req.json()
  const adapter = providers[providerId]
  if (!adapter) return NextResponse.json({ valid: false, error: 'Unknown provider' })

  const valid = await adapter.validateKey(apiKey)
  return NextResponse.json({ valid })
}
