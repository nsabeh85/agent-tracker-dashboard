import { Link } from 'react-router-dom'
import { savingsDashboardAlert, savingsReminderLabel } from '../lib/savingsCheckIn'
import type { AgentWithStages, Stage } from '../types/database'

export function SavingsCheckIns({
  agents,
  stages,
}: {
  agents: AgentWithStages[]
  stages: Stage[]
}) {
  const due = agents.flatMap((agent) => {
    const period = savingsReminderLabel(agent, stages)
    return period == null ? [] : [{ id: agent.id, title: agent.title, period }]
  })
  if (due.length === 0) return null

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Cost check-in
      </h2>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-100/80">
        Justin Taylor or Ajay Sudra can enter the cost saved. The reminder appears each month on the same calendar day the agent went live, from one month through one year and one month, and onward.
      </p>
      <ul className="mt-3 space-y-2">
        {due.map((item) => {
          const message = savingsDashboardAlert(item.title, item.period)
          return (
            <li key={item.id} className="text-sm text-amber-950 dark:text-amber-50">
              <Link to={`/agents/${item.id}`} className="font-semibold underline">
                {item.title}
              </Link>
              {message.slice(item.title.length)}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
