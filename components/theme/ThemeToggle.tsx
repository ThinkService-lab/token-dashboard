'use client'

import { Laptop, Moon, Sun } from 'lucide-react'

import { useTheme } from '@/components/theme/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const options = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
] as const

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  return (
    <TooltipProvider>
      <div
        className="inline-flex items-center rounded-lg border bg-background p-1"
        role="group"
        aria-label="Theme mode"
      >
        {options.map((option) => {
          const Icon = option.icon
          const isActive = theme === option.value
          const tooltipLabel =
            option.value === 'system'
              ? `System theme (${resolvedTheme})`
              : `${option.label} theme`

          return (
            <Tooltip key={option.value}>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      'text-muted-foreground',
                      isActive && 'bg-muted text-foreground shadow-sm'
                    )}
                    aria-pressed={isActive}
                    aria-label={option.label}
                    onClick={() => setTheme(option.value)}
                  >
                    <Icon />
                  </Button>
                }
              />
              <TooltipContent>{tooltipLabel}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
