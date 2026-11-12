import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark' | 'system'

// one shared store, so every toggle/radio on the page stays in sync
const listeners = new Set<() => void>()
const media = matchMedia('(prefers-color-scheme: dark)')

function read(): Theme {
  try {
    const t = localStorage.getItem('theme')
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}

let current: Theme = read()

function apply() {
  const dark = current === 'dark' || (current === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
}

media.addEventListener('change', apply)

function setTheme(next: Theme) {
  current = next
  try {
    if (next === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', next)
  } catch {
    /* storage blocked: the choice just won't persist */
  }
  apply()
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current)
  return { theme, setTheme }
}
