import { Link } from 'react-router-dom'
import { dueSavingsCheckpoint } from '../lib/savingsCheckIn'
import type { AgentWithStages, Stage } from '../types/database'

export function SavingsCheckIns({
  agents,
  stages,
}: {
  agents: AgentWithStages[]
  stages: Stage[]
}) {
  const due = agents.flatMap((agent) => {
    const period = dueSavingsCheckpoint(agent, stages, [])
    return period == null ? [] : [{ id: agent.id, title: agent.title, period }]
  })
  if (due.length === 0) return null

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Cost check-in
      </h2>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-100/80">
        Each live agent gets a note every 30 days it stays in production, asking for the cost saved.
      </p>
      <ul className="mt-3 space-y-2">
        {due.map((item) => (
          <li key={item.id} className="text-sm text-amber-950 dark:text-amber-50">
            <Link to={`/agents/${item.id}`} className="font-semibold underline">
              {item.title}
            </Link>{' '}
            has been live {item.period} days. Update the cost saved.
          </li>
        ))}
      </ul>
    </section>
  )
}
