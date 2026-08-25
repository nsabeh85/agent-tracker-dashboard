import { isAgentBehind, isPastTargetGoLive } from '../lib/schedule'
import type { Agent, AgentStage, Stage } from '../types/database'

type Props = {
  agent: Pick<Agent, 'target_go_live' | 'current_stage_id'>
  agentStages: AgentStage[]
  stages: Stage[]
  withLabel?: boolean
}

export function ScheduleMarker({ agent, agentStages, stages, withLabel = false }: Props) {
  const overdue = isPastTargetGoLive(agent, stages)
  const behind = isAgentBehind(agent, agentStages, stages)
  if (!overdue && !behind) return null

  const tone = overdue
    ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30'
    : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30'
  const label = overdue ? 'Past target' : 'Behind schedule'

  return (
    <span
      title={label}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${tone}`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden>
        {overdue ? (
          <path
            fill="currentColor"
            d="M8 1.5A6.5 6.5 0 1 0 14.5 8 6.51 6.51 0 0 0 8 1.5Zm.75 3a.75.75 0 0 0-1.5 0v3.4l2.22 1.48a.75.75 0 1 0 .83-1.25L8.75 7.55Z"
          />
        ) : (
          <path
            fill="currentColor"
            d="M8 1 1 13.5h14L8 1Zm0 4.5.9 5h-1.8L8 5.5ZM8 12.2a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z"
          />
        )}
      </svg>
      {withLabel ? label : <span className="sr-only">{label}</span>}
    </span>
  )
}
