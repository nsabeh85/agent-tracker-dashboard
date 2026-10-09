import { dueSavingsCheckpoint, savingsCheckInMessage } from '../src/lib/savingsCheckIn.ts'
import { mailConfigured, savingsRecipients, sendSavingsEmail } from './savingsMail.mjs'

const BOARD_URL = (
  process.env.BOARD_URL || 'https://agreeable-hill-03571850f.7.azurestaticapps.net'
).replace(/\/$/, '')

export async function runDueSavingsCheckIns(pool, today = new Date()) {
  const stages = await pool.query(
    'SELECT id, name, sort_order, default_duration_days FROM public.stages',
  )
  const agents = await pool.query(`
    SELECT agent.id, agent.title, agent.status, agent.current_stage_id, agent.target_go_live,
           COALESCE(
             json_agg(
               json_build_object(
                 'stage_id', stage.stage_id,
                 'actual_start', stage.actual_start,
                 'actual_end', stage.actual_end
               )
             ) FILTER (WHERE stage.id IS NOT NULL),
             '[]'
           ) AS agent_stages
    FROM public.agents AS agent
    LEFT JOIN public.agent_stages AS stage ON stage.agent_id = agent.id
    WHERE agent.status = 'active'
    GROUP BY agent.id
  `)
  const sent = await pool.query('SELECT agent_id, period_days FROM public.savings_checkins')
  const sentByAgent = new Map()
  for (const row of sent.rows) {
    const periods = sentByAgent.get(row.agent_id) ?? []
    periods.push(row.period_days)
    sentByAgent.set(row.agent_id, periods)
  }

  const due = []
  for (const agent of agents.rows) {
    const period = dueSavingsCheckpoint(
      { ...agent, agent_stages: agent.agent_stages ?? [] },
      stages.rows,
      sentByAgent.get(agent.id) ?? [],
      today,
    )
    if (period != null) due.push({ agent, period })
  }
  const recipients = savingsRecipients()
  if (!mailConfigured() || !recipients.primary) {
    return { due: due.length, sent: 0, reason: 'mail_not_configured' }
  }

  let sentCount = 0
  for (const item of due) {
    const message = savingsCheckInMessage(
      item.agent.title,
      item.period,
      `${BOARD_URL}/agents/${item.agent.id}`,
    )
    await sendSavingsEmail({
      to: recipients.primary,
      cc: recipients.secondary,
      subject: message.subject,
      text: message.text,
    })
    await pool.query(
      `INSERT INTO public.savings_checkins (agent_id, period_days)
       VALUES ($1, $2)
       ON CONFLICT (agent_id, period_days) DO NOTHING`,
      [item.agent.id, item.period],
    )
    sentCount += 1
  }
  return { due: due.length, sent: sentCount }
}
