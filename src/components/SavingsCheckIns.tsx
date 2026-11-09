import { Link } from 'react-router-dom'
import { AgentTitle } from './AgentTitle'
import { presentedTitle } from '../lib/pctTitle'
import {
  savingsBannerMailto,
  savingsDashboardAlert,
  savingsReminderLabel,
} from '../lib/savingsCheckIn'
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

  const mailto = savingsBannerMailto(
    due.map((item) => ({
      title: item.label,
      periodLabel: item.period,
      boardUrl: `${window.location.origin}/agents/${item.id}`,
    })),
  )

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Cost check-in
        </h2>
        <a
          href={mailto}
          className="rounded-full bg-amber-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-800"
        >
          Send
        </a>
      </div>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-100/80">
        Send opens the finished email to Justin Taylor, with Ajay Sudra copied. Send it from your mailbox.
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
