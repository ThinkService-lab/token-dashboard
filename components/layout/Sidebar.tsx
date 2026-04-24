'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BarChart2, DollarSign, Cpu, Activity } from 'lucide-react'

const NAV = [
  { label: 'Overview', slug: 'overview', icon: Activity },
  { label: 'Usage', slug: 'usage', icon: BarChart2 },
  { label: 'Costs', slug: 'costs', icon: DollarSign },
  { label: 'Claude Code', slug: 'claude-code', icon: Cpu },
]

interface Props {
  providerId: string
}

export function Sidebar({ providerId }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const qs = searchParams.toString()

  return (
    <nav className="w-44 shrink-0 border-r h-full pt-4 flex flex-col gap-0.5 px-2">
      {NAV.map(({ label, slug, icon: Icon }) => {
        const href = `/dashboard/${providerId}/${slug}${qs ? `?${qs}` : ''}`
        const active = pathname.includes(`/${slug}`)
        return (
          <Link
            key={slug}
            href={href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
              active ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
