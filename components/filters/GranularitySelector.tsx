'use client'
import { Button } from '@/components/ui/button'
import type { Granularity } from '@/lib/providers/types'

const OPTIONS: { value: Granularity; label: string }[] = [
  { value: '1min', label: '1m' },
  { value: '1hr', label: '1h' },
  { value: '1day', label: '1d' },
]

interface Props {
  value: Granularity
  onChange: (g: Granularity) => void
  start?: string
  end?: string
}

function rangeDays(start?: string, end?: string): number {
  if (!start || !end) return Infinity
  return (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
}

export function GranularitySelector({ value, onChange, start, end }: Props) {
  const days = rangeDays(start, end)

  return (
    <div className="flex rounded-md border overflow-hidden">
      {OPTIONS.map((opt) => {
        const disabled = opt.value === '1min' && days > 1
        return (
          <Button
            key={opt.value}
            variant="ghost"
            size="sm"
            className={`rounded-none border-0 h-8 px-3 text-xs ${value === opt.value ? 'bg-primary text-primary-foreground hover:bg-primary' : ''}`}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            title={disabled ? 'Only available for ranges ≤ 1 day' : undefined}
          >
            {opt.label}
          </Button>
        )
      })}
    </div>
  )
}
