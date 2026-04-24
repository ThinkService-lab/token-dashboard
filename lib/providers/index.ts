import { anthropicAdapter } from './anthropic'
import { openaiAdapter } from './openai'
import type { ProviderAdapter } from './types'

export const providers: Record<string, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
}

export { anthropicAdapter, openaiAdapter }
export type { ProviderAdapter }
export * from './types'
