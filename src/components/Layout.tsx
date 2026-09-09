import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../lib/auth'
import { initials } from '../lib/schedule'
import { isDemoMode, supabase } from '../lib/supabase'

const NAV_LINK =
  'rounded-full px-3 py-2 font-medium transition hover:-translate-y-0.5'

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return [
    NAV_LINK,
    isActive
      ? 'bg-brand-600 shadow-brand-600/25 text-white shadow-lg'
      : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100',
  ].join(' ')
}

export function Layout() {
  const navigate = useNavigate()
  const { admin, configured, isDlrUser, session } = useAuth()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh">
      <header className="border-ink-200/70 dark:border-ink-800 dark:bg-ink-950/70 sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="group flex min-w-0 items-center gap-3">
            <span className="from-brand-500 to-brand-700 shadow-brand-600/30 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" aria-hidden>
                <path
                  d="m3.5 17.5 5-5 4 2.5 8-9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="3.5" cy="17.5" r="2" fill="currentColor" />
                <circle cx="8.5" cy="12.5" r="2" fill="currentColor" />
                <circle cx="12.5" cy="15" r="2" fill="currentColor" />
                <circle cx="20.5" cy="6" r="2" fill="currentColor" />
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
            {admin ? (
              <>
                <NavLink
                  to="/agents/new"
                  className={navLinkClass}
                >
                  New agent
                </NavLink>
                <NavLink
                  to="/settings"
                  className={navLinkClass}
                >
                  Settings
                </NavLink>
                <span
                  title={admin.email}
                  className="bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 hidden h-9 w-9 items-center justify-center rounded-full text-xs font-bold sm:flex"
                >
                  {initials(admin.display_name)}
                </span>
              </>
            ) : session && isDlrUser ? (
              <span className="text-ink-400 hidden text-xs sm:inline">View only</span>
            ) : configured ? (
              <NavLink
                to="/login"
                className="text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100 rounded-full px-3 py-2 font-medium transition"
              >
                Sign in
              </NavLink>
            ) : null}
            {session ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100 rounded-full px-3 py-2 font-medium transition"
              >
                Sign out
              </button>
            ) : null}
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
        Digital Realty employees can view this tracker. Only authorized administrators can edit.
      </footer>
    </div>
  )
}
