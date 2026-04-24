'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GroupByDimension } from '@/lib/providers/types'

const DIMENSIONS: { value: GroupByDimension; label: string }[] = [
  { value: 'model', label: 'Model' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'api_key', label: 'API Key' },
  { value: 'service_tier', label: 'Service Tier' },
  { value: 'context_window', label: 'Context Window' },
]

interface Props {
  value: GroupByDimension | ''
  onChange: (d: GroupByDimension | '') => void
  available?: GroupByDimension[]
}

export function GroupBySelector({ value, onChange, available }: Props) {
  const options = available
    ? DIMENSIONS.filter((d) => available.includes(d.value))
    : DIMENSIONS

  return (
    <Select value={value} onValueChange={(v) => onChange(v as GroupByDimension | '')}>
      <SelectTrigger className="h-8 text-xs w-36">
        <SelectValue placeholder="Group by…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">None</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
