'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { providers } from '@/lib/providers'
import { cn } from '@/lib/utils'

export function ProviderTabs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [connectedIds, setConnectedIds] = useState<string[]>([])

  useEffect(() => {
    const ids = Object.keys(providers).filter((id) =>
      localStorage.getItem(`token_dashboard_apikey_${id}`)
    )
    setConnectedIds(ids)
  }, [])

  const tabs = [
    ...(connectedIds.length > 1 ? [{ id: 'all', label: 'All Providers', color: '#8b5cf6' }] : []),
    ...connectedIds.map((id) => ({ ...providers[id] })),
  ]

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
