import { Monitor, Moon, Sun } from 'lucide-react'

import { useTheme, type Theme } from '@/hooks/useTheme'

import { Button } from './ui/Button'

const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' }
const icons = { light: Sun, dark: Moon, system: Monitor }

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const Icon = icons[theme]
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(next[theme])}
      aria-label={`Theme: ${theme}. Switch to ${next[theme]}`}
      title={`Theme: ${theme}`}
      icon={<Icon className="size-4" />}
    />
  )
}
