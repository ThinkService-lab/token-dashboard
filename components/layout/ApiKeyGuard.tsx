'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function ApiKeyGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const hasKey = Object.keys(localStorage).some((k) => k.startsWith('token_dashboard_apikey_'))
    if (!hasKey) {
      router.replace('/settings')
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) return null
  return <>{children}</>
}
