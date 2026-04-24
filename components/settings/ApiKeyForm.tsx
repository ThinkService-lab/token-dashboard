'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useApiKey } from '@/hooks/useApiKey'
import { providers } from '@/lib/providers'

interface Props {
  providerId: string
}

export function ApiKeyForm({ providerId }: Props) {
  const provider = providers[providerId]
  const { apiKey, setApiKey } = useApiKey(providerId)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')

  if (!provider) return null

  async function handleValidate() {
    const key = input.trim()
    if (!key) return
    setStatus('validating')
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ providerId, apiKey: key }),
    })
    const json = await res.json()
    if (json.valid) {
      setApiKey(key)
      setStatus('valid')
      setInput('')
    } else {
      setStatus('invalid')
    }
  }

  function handleClear() {
    setApiKey(null)
    setStatus('idle')
    setInput('')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: provider.color }} />
        <span className="font-medium text-sm">{provider.label}</span>
        {apiKey && <Badge variant="outline" className="text-xs text-green-600 border-green-400">Connected</Badge>}
      </div>

      {apiKey ? (
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {apiKey.slice(0, 12)}••••••••••••
          </span>
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-destructive text-xs h-7">
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={provider.adminKeyHint}
            value={input}
            onChange={(e) => { setInput(e.target.value); setStatus('idle') }}
            onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
            className="font-mono text-sm h-9 max-w-sm"
          />
          <Button size="sm" onClick={handleValidate} disabled={!input.trim() || status === 'validating'} className="h-9">
            {status === 'validating' ? 'Checking…' : 'Connect'}
          </Button>
        </div>
      )}

      {status === 'invalid' && (
        <p className="text-xs text-destructive">
          Invalid key — make sure you&apos;re using an Admin API key, not a regular API key.
        </p>
      )}
      {status === 'valid' && (
        <p className="text-xs text-green-600">Key validated and saved.</p>
      )}
    </div>
  )
}
