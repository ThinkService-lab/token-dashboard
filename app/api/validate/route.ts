import { NextRequest, NextResponse } from 'next/server'
import { providers } from '@/lib/providers'
import { getProviderApiKey } from '@/lib/server/provider-keys'

export async function POST(req: NextRequest) {
  try {
    const { providerId } = await req.json()
    const adapter = providers[providerId]
    if (!adapter) {
      return NextResponse.json({ valid: false, error: 'Unknown provider' }, { status: 400 })
    }

    const apiKey = getProviderApiKey(providerId)
    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: 'Provider key is not configured on the server' },
        { status: 400 }
      )
    }

    const valid = await adapter.validateKey(apiKey)
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Invalid validation request' },
      { status: 400 }
    )
  }
}
