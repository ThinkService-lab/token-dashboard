'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
// PopoverTrigger from base-ui does not support asChild — styled directly
import { Calendar } from '@/components/ui/calendar'
import { DATE_PRESETS } from '@/lib/constants'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon } from 'lucide-react'

interface Props {
  start?: string
  end?: string
  onChange: (start?: string, end?: string) => void
}

function toIso(d: Date | undefined): string | undefined {
  return d ? d.toISOString() : undefined
}

function label(start?: string, end?: string): string {
  if (!start && !end) return 'All time'
  const fmt = (s?: string) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?'
  return `${fmt(start)} – ${fmt(end)}`
}

export function DateRangePicker({ start, end, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>(
    start ? { from: new Date(start), to: end ? new Date(end) : undefined } : undefined
  )

  function applyPreset(days: number | null) {
    if (days === null) {
      setRange(undefined)
      onChange(undefined, undefined)
    } else {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - days)
      setRange({ from, to })
      onChange(from.toISOString(), to.toISOString())
    }
    setOpen(false)
  }

  function applyCustom() {
    if (range?.from) {
      onChange(toIso(range.from), toIso(range.to))
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex items-center gap-1.5 h-8 px-3 text-xs font-normal rounded-md border bg-background hover:bg-muted transition-colors">
        <CalendarIcon className="h-3.5 w-3.5" />
        {label(start, end)}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col gap-1 p-3 border-r">
            {DATE_PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="ghost"
                size="sm"
                className="justify-start text-xs h-7"
                onClick={() => applyPreset(p.days)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="p-3 space-y-2">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
            <div className="flex justify-end">
              <Button size="sm" className="h-7 text-xs" onClick={applyCustom} disabled={!range?.from}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
