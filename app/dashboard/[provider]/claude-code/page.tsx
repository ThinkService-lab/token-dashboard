'use client'
import { use, Suspense } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function ClaudeCodeContent({ providerId }: { providerId: string }) {
  const isAnthropicProvider = providerId === 'anthropic'
  return (
    <>
      <Topbar title="Claude Code" />
      <div className="p-4">
        {!isAnthropicProvider ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Claude Code metrics are only available for the Anthropic provider.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Claude Code Usage</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Claude Code analytics require the <code className="bg-muted px-1 rounded text-xs">/v1/organizations/claude_code</code> endpoint.
              This page will show per-user costs and developer productivity metrics once the endpoint is wired up.
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

export default function ClaudeCodePage({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = use(params)
  return <Suspense><ClaudeCodeContent providerId={provider} /></Suspense>
}
