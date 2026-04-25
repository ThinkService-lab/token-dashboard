'use client'
import { useFilters } from '@/hooks/useFilters'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { GranularitySelector } from '@/components/filters/GranularitySelector'
import { GroupBySelector } from '@/components/filters/GroupBySelector'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import type { GroupByDimension } from '@/lib/providers/types'

interface Props {
  title: string
  availableGroupBy?: GroupByDimension[]
}

export function Topbar({ title, availableGroupBy }: Props) {
  const [filters, setFilters] = useFilters()
  const groupByValue = filters.groupBy[0] ?? ''

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <h1 className="font-semibold text-sm">{title}</h1>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DateRangePicker
          start={filters.start}
          end={filters.end}
          onChange={(start, end) => setFilters({ start, end })}
        />
        <GranularitySelector
          value={filters.granularity}
          onChange={(g) => setFilters({ granularity: g })}
          start={filters.start}
          end={filters.end}
        />
        <GroupBySelector
          value={groupByValue as GroupByDimension | ''}
          onChange={(d) => setFilters({ groupBy: d ? [d] : [] })}
          available={availableGroupBy}
        />
      </div>
    </div>
  )
}
