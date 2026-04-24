import { Separator } from '@/components/ui/separator'
import { ApiKeyForm } from '@/components/settings/ApiKeyForm'
import { providers } from '@/lib/providers'

export default function SettingsPage() {
  const providerIds = Object.keys(providers)

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your AI provider admin keys to start tracking usage and costs. Keys are stored locally in your browser and never sent to any server other than the provider&apos;s API.
        </p>
      </div>

      <Separator />

      <div className="space-y-6">
        <h2 className="text-base font-medium">API Keys</h2>
        {providerIds.map((id, i) => (
          <div key={id}>
            <ApiKeyForm providerId={id} />
            {i < providerIds.length - 1 && <Separator className="mt-6" />}
          </div>
        ))}
      </div>

      <Separator />

      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Anthropic:</strong> Requires an Admin API key (sk-ant-admin...) from your Anthropic Console → Organization Settings → API Keys.</p>
        <p><strong>OpenAI:</strong> Requires an Admin API key from platform.openai.com/organization/api-keys.</p>
      </div>
    </div>
  )
}
