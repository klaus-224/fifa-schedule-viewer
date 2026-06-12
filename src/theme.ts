export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'fifa-schedule-2026-theme'

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'light' || value === 'dark'

export const getSystemTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isThemeMode(stored) ? stored : getSystemTheme()
}

export const applyTheme = (theme: ThemeMode) => {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export const persistTheme = (theme: ThemeMode) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, theme)
}
