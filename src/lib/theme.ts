export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'agent-tracker-theme'

/** Dark is the house style; a stored choice always wins. */
export const DEFAULT_THEME: Theme = 'dark'

export function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

export function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? DEFAULT_THEME
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage can be blocked; the in-memory theme still applies for this session.
  }
}
