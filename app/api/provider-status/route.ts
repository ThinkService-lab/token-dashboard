import { NextResponse } from 'next/server'
import { getProviderKeyStatus } from '@/lib/server/provider-keys'

export async function GET() {
  return NextResponse.json({ providers: getProviderKeyStatus() })
}
