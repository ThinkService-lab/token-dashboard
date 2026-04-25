import 'server-only'
import { providers } from '@/lib/providers'

const providerEnvVars: Record<string, string> = {
  anthropic: 'ANTHROPIC_ADMIN_KEY',
  openai: 'OPENAI_ADMIN_KEY',
}

export function getProviderApiKey(providerId: string): string | null {
  const envVar = providerEnvVars[providerId]
  if (!envVar) return null

  const value = process.env[envVar]?.trim()
  return value ? value : null
}

export function getProviderKeyStatus() {
  return Object.keys(providers).map((id) => ({
    id,
    label: providers[id].label,
    color: providers[id].color,
    envVar: providerEnvVars[id] ?? null,
    configured: Boolean(getProviderApiKey(id)),
  }))
}

export function requireProviderApiKey(providerId: string): string {
  const apiKey = getProviderApiKey(providerId)
  if (!apiKey) {
    const envVar = providerEnvVars[providerId]
    throw new Error(envVar ? `Missing ${envVar}` : 'Provider has no configured server key')
  }
  return apiKey
}
