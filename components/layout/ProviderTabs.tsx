'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { providers } from '@/lib/providers'
import { cn } from '@/lib/utils'
import { useProviderStatus } from '@/hooks/useProviderStatus'

export function ProviderTabs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { providers: status } = useProviderStatus()
  const connectedIds = status.filter((provider) => provider.configured).map((provider) => provider.id)

  const tabs = connectedIds.map((id) => ({ ...providers[id] }))

  const currentProvider = pathname.split('/')[2] ?? 'all'
  const qs = searchParams.toString()

  return (
    <div className="flex gap-1 border-b px-4">
      {tabs.map((tab) => {
        const href = `/dashboard/${tab.id}/overview${qs ? `?${qs}` : ''}`
        const active = currentProvider === tab.id
        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors',
              active
                ? 'border-current font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            style={active ? { color: tab.color, borderColor: tab.color } : undefined}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: tab.color }}
            />
            {tab.label}
          </Link>
        )
      })}
      <Link
        href="/settings"
        className="ml-auto flex items-center px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground"
      >
        Settings
      </Link>
    </div>
  )
}
