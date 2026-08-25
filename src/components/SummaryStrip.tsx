import type { ReactNode } from 'react'
import {
  createdThisMonth,
  isAgentBehind,
  isInFlight,
  isLiveAgent,
} from '../lib/schedule'
import type { AgentWithStages, Stage } from '../types/database'

type Props = {
  agents: AgentWithStages[]
  stages: Stage[]
}

type Tone = 'brand' | 'emerald' | 'amber' | 'plain'

const TONES: Record<Tone, { badge: string; value: string }> = {
  brand: { badge: 'bg-white/15 text-white', value: 'text-white' },
  emerald: { badge: 'bg-emerald-400/20 text-emerald-200', value: 'text-emerald-200' },
  amber: { badge: 'bg-amber-400/20 text-amber-200', value: 'text-amber-200' },
  plain: { badge: 'bg-white/15 text-white', value: 'text-white' },
}

function Tile({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: Tone
  icon: ReactNode
}) {
  const styles = TONES[tone]
  return (
    <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15">
      <span
        className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${styles.badge}`}
      >
        {icon}
      </span>
      <p className={`text-3xl leading-none font-bold tracking-tight ${styles.value}`}>{value}</p>
      <p className="mt-1.5 text-xs font-semibold tracking-wide text-white/70 uppercase">{label}</p>
    </div>
  )
}

export function SummaryStrip({ agents, stages }: Props) {
  const pending = agents.filter((a) => a.status === 'pending_approval').length
  const inFlight = agents.filter((a) => isInFlight(a, stages)).length
  const live = agents.filter((a) => isLiveAgent(a, stages)).length
  const behind = agents.filter((a) => isAgentBehind(a, a.agent_stages, stages)).length
  const thisMonth = agents.filter((a) => createdThisMonth(a.created_at)).length

  return (
    <section className="from-brand-700 via-brand-600 to-brand-800 shadow-brand-900/20 dark:from-brand-900 dark:via-brand-800 dark:to-ink-900 dark:ring-brand-500/20 relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 shadow-xl md:p-8 dark:shadow-black/40 dark:ring-1">
      <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-10 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />

      <div className="relative">
        <p className="text-[11px] font-bold tracking-[0.2em] text-white/60 uppercase">
          Live status board
        </p>
        <h2 className="mt-1 max-w-xl text-2xl font-bold tracking-tight text-white md:text-3xl">
          Every Copilot Studio request, from intake to live.
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Tile
            label="Pending approval"
            value={pending}
            tone="amber"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path
                  fill="currentColor"
                  d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 5v6.2l3.4 2.03-.8 1.34L11 14V7h2Z"
                />
              </svg>
            }
          />
          <Tile
            label="In flight"
            value={inFlight}
            tone="brand"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path
                  fill="currentColor"
                  d="M3 12a9 9 0 1 1 3 6.7v-3.2a6 6 0 1 0-1.6-5.3H7L3.3 14 0 10.2h2.4A9 9 0 0 1 3 12Z"
                />
              </svg>
            }
          />
          <Tile
            label="Live"
            value={live}
            tone="emerald"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4 12.5 5 5L20 6.5"
                />
              </svg>
            }
          />
          <Tile
            label="Behind schedule"
            value={behind}
            tone="amber"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path fill="currentColor" d="M12 2 1 21h22L12 2Zm1 7v6h-2V9h2Zm0 8v2h-2v-2h2Z" />
              </svg>
            }
          />
          <Tile
            label="Requests this month"
            value={thisMonth}
            tone="plain"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path
                  fill="currentColor"
                  d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7ZM5 9h14v10H5V9Z"
                />
              </svg>
            }
          />
        </div>
      </div>
    </section>
  )
}
