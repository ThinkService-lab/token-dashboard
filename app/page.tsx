import { redirect } from 'next/navigation'
import { getProviderKeyStatus } from '@/lib/server/provider-keys'

export default function Home() {
  const provider = getProviderKeyStatus().find((item) => item.configured)
  redirect(provider ? `/dashboard/${provider.id}/overview` : '/settings')
}
