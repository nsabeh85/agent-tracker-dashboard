import { Link } from 'react-router-dom'
import { AgentTitle } from './AgentTitle'
import { presentedTitle } from '../lib/pctTitle'
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
    const label = presentedTitle(agent.title, agent.source_url)
    return period == null
      ? []
      : [{ id: agent.id, title: agent.title, sourceUrl: agent.source_url, label, period }]
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
          const message = savingsDashboardAlert(item.label, item.period)
          return (
            <li key={item.id} className="text-sm text-amber-950 dark:text-amber-50">
              <Link to={`/agents/${item.id}`} className="font-semibold underline">
                <AgentTitle
                  as="span"
                  title={item.title}
                  sourceUrl={item.sourceUrl}
                  insideLink
                  linkClassName="underline underline-offset-2"
                />
              </Link>
              {message.slice(item.label.length)}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
