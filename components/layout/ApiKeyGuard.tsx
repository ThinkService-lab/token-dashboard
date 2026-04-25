'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProviderStatus } from '@/hooks/useProviderStatus'

export function ApiKeyGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { providers, isLoading } = useProviderStatus()
  const hasConfiguredProvider = providers.some((provider) => provider.configured)

  useEffect(() => {
    if (!isLoading && !hasConfiguredProvider) {
      router.replace('/settings')
    }
  }, [hasConfiguredProvider, isLoading, router])

  if (isLoading || !hasConfiguredProvider) return null
  return <>{children}</>
}
