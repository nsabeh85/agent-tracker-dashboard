import {
  formatUsd,
  liveAgentsWithSavings,
  savingsByDepartment,
  savingsLabel,
  totalLiveAnnualSavings,
  totalLiveRealizedSavings,
} from '../lib/savings'
import type { AgentWithStages, Stage } from '../types/database'

export function SavingsBreakdown({
  agents,
  stages,
}: {
  agents: AgentWithStages[]
  stages: Stage[]
}) {
  const overall = totalLiveAnnualSavings(agents, stages)
  const realized = totalLiveRealizedSavings(agents, stages)
  const departments = savingsByDepartment(agents, stages)
  const rows = liveAgentsWithSavings(agents, stages)

  return (
    <section className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 space-y-5 rounded-3xl border bg-white p-5 shadow-sm md:p-6">
      <div>
        <h3 className="text-ink-900 dark:text-ink-50 text-sm font-bold tracking-wide uppercase">
          Estimated savings
        </h3>
        <p className="text-ink-500 dark:text-ink-400 mt-1 text-sm">
          Annual figures are a full-year projection (monthly × 12). Saved so far adds one month of
          value for each month a live agent has been in service.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <p className="text-ink-900 dark:text-ink-50 text-3xl font-bold tracking-tight">
          {formatUsd(overall)}
          <span className="text-ink-400 ml-2 text-sm font-semibold tracking-wide uppercase">
            / yr projected
          </span>
        </p>
        <p className="text-ink-900 dark:text-ink-50 text-3xl font-bold tracking-tight">
          {formatUsd(realized)}
          <span className="text-ink-400 ml-2 text-sm font-semibold tracking-wide uppercase">
            saved so far
          </span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="text-ink-400 mb-2 text-[10px] font-bold tracking-[0.12em] uppercase">
            By department
          </h4>
          {departments.length === 0 ? (
            <p className="text-ink-400 text-sm">No live savings entered yet.</p>
          ) : (
            <ul className="space-y-2">
              {departments.map((row) => (
                <li key={row.department} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink-800 dark:text-ink-100 font-medium">{row.department}</span>
                  <span className="text-ink-900 dark:text-ink-50 font-semibold">
                    {formatUsd(row.annual)}
                    <span className="text-ink-400 ml-1 text-xs font-medium">/ yr</span>
                    <span className="text-ink-400 ml-2 text-xs font-medium">
                      {formatUsd(row.realized)} so far
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="text-ink-400 mb-2 text-[10px] font-bold tracking-[0.12em] uppercase">
            By live agent
          </h4>
          {rows.length === 0 ? (
            <p className="text-ink-400 text-sm">No live agent has a savings estimate.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map(({ agent, annual, realized: agentRealized }) => (
                <li key={agent.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink-800 dark:text-ink-100 min-w-0 truncate font-medium">
                    {agent.title}
                  </span>
                  <span className="text-ink-900 dark:text-ink-50 shrink-0 font-semibold">
                    {savingsLabel(agent.savings_amount, agent.savings_cadence)}
                    <span className="text-ink-400 ml-1 text-xs font-medium">
                      ({formatUsd(annual)} / yr · {formatUsd(agentRealized)} so far)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
