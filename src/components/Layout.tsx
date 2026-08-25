import { Link, NavLink, Outlet } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { isDemoMode } from '../lib/supabase'

export function Layout() {
  return (
    <div className="min-h-svh">
      <header className="border-ink-200/70 dark:border-ink-800 dark:bg-ink-950/70 sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="group flex min-w-0 items-center gap-3">
            <span className="from-brand-500 to-brand-700 shadow-brand-600/30 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" aria-hidden>
                <circle cx="5" cy="12" r="2.6" fill="currentColor" />
                <circle cx="12" cy="12" r="2.6" fill="currentColor" />
                <circle cx="19" cy="12" r="2.6" fill="currentColor" opacity="0.45" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="text-ink-400 block text-[10px] font-bold tracking-[0.2em] uppercase">
                Copilot Studio
              </span>
              <span className="text-ink-900 dark:text-ink-50 block truncate text-lg font-bold tracking-tight">
                Agent Tracker
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-2 text-sm">
            <NavLink
              to="/agents/new"
              className="bg-brand-600 shadow-brand-600/25 hover:bg-brand-700 rounded-full px-4 py-2 font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
            >
              New agent
            </NavLink>
            <NavLink
              to="/settings"
              className="text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100 rounded-full px-3 py-2 font-medium transition"
            >
              Settings
            </NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {isDemoMode ? (
        <div className="border-b border-amber-200 bg-amber-50/80 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          Preview data. Add{' '}
          <code className="dark:bg-ink-900 rounded bg-white px-1 py-0.5">VITE_SUPABASE_URL</code>{' '}
          and{' '}
          <code className="dark:bg-ink-900 rounded bg-white px-1 py-0.5">
            VITE_SUPABASE_ANON_KEY
          </code>{' '}
          to load real requests.
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="text-ink-400 dark:text-ink-500 mx-auto max-w-6xl px-4 pb-10 text-xs">
        Anyone with the link can view and update this tracker.
      </footer>
    </div>
  )
}
