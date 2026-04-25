import { Separator } from '@/components/ui/separator'
import { ApiKeyForm } from '@/components/settings/ApiKeyForm'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { providers } from '@/lib/providers'

export default function SettingsPage() {
  const providerIds = Object.keys(providers)

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure AI provider admin keys as server environment variables. Keys are never entered, stored, or sent from the browser.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <Separator />

      <div className="space-y-6">
        <h2 className="text-base font-medium">Server API Keys</h2>
        {providerIds.map((id, i) => (
          <div key={id}>
            <ApiKeyForm providerId={id} />
            {i < providerIds.length - 1 && <Separator className="mt-6" />}
          </div>
        ))}
      </div>

      <Separator />

      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Anthropic:</strong> Set <code>ANTHROPIC_ADMIN_KEY</code> to an Admin API key from your Anthropic Console organization settings.</p>
        <p><strong>OpenAI:</strong> Set <code>OPENAI_ADMIN_KEY</code> to an Admin API key from platform.openai.com organization API keys.</p>
      </div>
    </div>
  )
}
