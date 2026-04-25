import { Sidebar } from '@/components/layout/Sidebar'
import { ProviderTabs } from '@/components/layout/ProviderTabs'
import { ApiKeyGuard } from '@/components/layout/ApiKeyGuard'
import { redirect } from 'next/navigation'
import { getProviderKeyStatus } from '@/lib/server/provider-keys'

interface Props {
  children: React.ReactNode
  params: Promise<{ provider: string }>
}

export default async function DashboardLayout({ children, params }: Props) {
  const { provider } = await params
  const configuredProviders = getProviderKeyStatus().filter((item) => item.configured)
  const currentProviderConfigured = configuredProviders.some((item) => item.id === provider)

  if (configuredProviders.length === 0) {
    redirect('/settings')
  }

  if (!currentProviderConfigured) {
    redirect(`/dashboard/${configuredProviders[0].id}/overview`)
  }

  return (
    <ApiKeyGuard>
      <div className="flex flex-col h-screen">
        <ProviderTabs />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar providerId={provider} />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ApiKeyGuard>
  )
}
