import { Sidebar } from '@/components/layout/Sidebar'
import { ProviderTabs } from '@/components/layout/ProviderTabs'
import { ApiKeyGuard } from '@/components/layout/ApiKeyGuard'

interface Props {
  children: React.ReactNode
  params: Promise<{ provider: string }>
}

export default async function DashboardLayout({ children, params }: Props) {
  const { provider } = await params
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
