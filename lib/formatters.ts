export function formatTokenCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function formatUSD(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(6)}`
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

export function formatDate(iso: string, granularity: string): string {
  const d = new Date(iso)
  if (granularity === '1min') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (granularity === '1hr') return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${(delta * 100).toFixed(1)}%`
}
