'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = Exclude<Theme, 'system'>

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'token-dashboard-theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const storedTheme = localStorage.getItem(STORAGE_KEY)
  return storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system'
    ? storedTheme
    : 'system'
}

function applyTheme(theme: Theme) {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme
  const root = document.documentElement

  root.classList.toggle('dark', resolvedTheme === 'dark')
  root.style.colorScheme = resolvedTheme

  return resolvedTheme
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemTheme(getSystemTheme())

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme, systemTheme])

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
    localStorage.setItem(STORAGE_KEY, nextTheme)
  }

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}
