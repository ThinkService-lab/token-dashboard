'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useProviderStatus } from '@/hooks/useProviderStatus'
import { providers } from '@/lib/providers'

interface Props {
  providerId: string
}

export function ApiKeyForm({ providerId }: Props) {
  const provider = providers[providerId]
  const { providers: statuses, isLoading } = useProviderStatus()
  const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const providerStatus = statuses.find((item) => item.id === providerId)
  const configured = Boolean(providerStatus?.configured)

  if (!provider) return null

  async function handleValidate() {
    if (!configured) return
    setStatus('validating')
    setMessage(null)

    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ providerId }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error ?? 'Validation failed')
      }

      if (json.valid) {
        setStatus('valid')
        return
      }

      setStatus('invalid')
      setMessage(json.error ?? 'Server key is missing or invalid. Confirm the env var is set to an Admin API key and restart the app.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Validation failed')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: provider.color }} />
        <span className="font-medium text-sm">{provider.label}</span>
        {configured ? (
          <Badge variant="outline" className="text-xs text-green-600 border-green-400">Configured</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">Missing</Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {providerStatus?.envVar ?? 'No server env var'}
        </span>
        <Button size="sm" onClick={handleValidate} disabled={!configured || isLoading || status === 'validating'} className="h-8">
          {status === 'validating' ? 'Checking...' : 'Validate'}
        </Button>
      </div>

      {status === 'invalid' && (
        <p className="text-xs text-destructive">
          {message ?? 'Server key is missing or invalid. Confirm the env var is set to an Admin API key and restart the app.'}
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs text-destructive">
          {message ?? 'Validation failed.'}
        </p>
      )}
      {status === 'valid' && (
        <p className="text-xs text-green-600">Server key validated.</p>
      )}
      {!configured && (
        <p className="text-xs text-muted-foreground">
          Add this value to `.env.local` or your deployment secret store. Do not enter admin keys in the browser.
        </p>
      )}
    </div>
  )
}
