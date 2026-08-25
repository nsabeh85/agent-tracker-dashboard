import { useEffect, useState } from 'react'
import { applyTheme, resolveInitialTheme, type Theme } from '../lib/theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="border-ink-200 text-ink-500 hover:text-ink-900 hover:border-ink-300 dark:border-ink-700 dark:text-ink-400 dark:hover:text-ink-100 dark:hover:border-ink-600 flex h-9 w-9 items-center justify-center rounded-full border transition"
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            fill="currentColor"
            d="M12 4.5a1 1 0 0 1-1-1V2a1 1 0 1 1 2 0v1.5a1 1 0 0 1-1 1Zm0 15a1 1 0 0 1 1 1V22a1 1 0 1 1-2 0v-1.5a1 1 0 0 1 1-1ZM22 12a1 1 0 0 1-1 1h-1.5a1 1 0 1 1 0-2H21a1 1 0 0 1 1 1ZM4.5 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1.5a1 1 0 0 1 1 1Zm14.1-7.1a1 1 0 0 1 0 1.4l-1.1 1.1a1 1 0 0 1-1.4-1.4l1.1-1.1a1 1 0 0 1 1.4 0ZM7.9 16.1a1 1 0 0 1 0 1.4l-1.1 1.1a1 1 0 1 1-1.4-1.4l1.1-1.1a1 1 0 0 1 1.4 0Zm10.7 2.5a1 1 0 0 1-1.4 0l-1.1-1.1a1 1 0 0 1 1.4-1.4l1.1 1.1a1 1 0 0 1 0 1.4ZM7.9 7.9a1 1 0 0 1-1.4 0L5.4 6.8a1 1 0 0 1 1.4-1.4l1.1 1.1a1 1 0 0 1 0 1.4ZM12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            fill="currentColor"
            d="M21.3 14.2A9.2 9.2 0 0 1 9.8 2.7a1 1 0 0 0-1.3-1.2A10.5 10.5 0 1 0 22.5 15.5a1 1 0 0 0-1.2-1.3Z"
          />
        </svg>
      )}
    </button>
  )
}
