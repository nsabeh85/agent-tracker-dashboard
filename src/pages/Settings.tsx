import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog, useRealtimeTick } from '../hooks/useTracker'
import { isDigitalRealtyEmail, useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { Stage, Substep } from '../types/database'

export function SettingsPage() {
  const tick = useRealtimeTick()
  const { stages, substeps, reload } = useCatalog(tick)
  const { admin, admins, reloadAdmins } = useAuth()
  const [error, setError] = useState<string | null>(null)

  async function addAdmin() {
    const email = window.prompt('Admin @digitalrealty.com email')
    if (!email?.trim()) return
    const normalizedEmail = email.trim().toLowerCase()
    if (!isDigitalRealtyEmail(normalizedEmail)) {
      setError('Administrators must use an @digitalrealty.com email address.')
      return
    }
    const displayName = window.prompt('Admin full name (first and last)')
    if (!displayName?.trim() || !/^\S+(?:\s+\S+)+$/.test(displayName.trim())) {
      setError('Enter both a first and last name.')
      return
    }
    const { error: adminError } = await supabase.from('admins').upsert({
      email: normalizedEmail,
      display_name: displayName.trim().replace(/\s+/g, ' '),
    })
    if (adminError) setError(adminError.message)
    else {
      setError(null)
      await reloadAdmins()
    }
  }

  async function removeAdmin(email: string) {
    if (email.toLowerCase() === admin?.email.toLowerCase()) {
      setError('You cannot remove your own administrator access.')
      return
    }
    if (!window.confirm(`Remove administrator access for ${email}?`)) return
    const { error: adminError } = await supabase.from('admins').delete().eq('email', email)
    if (adminError) setError(adminError.message)
    else {
      setError(null)
      await reloadAdmins()
    }
  }

  async function moveStage(stage: Stage, direction: -1 | 1) {
    const ordered = [...stages].sort((a, b) => a.sort_order - b.sort_order)
    const index = ordered.findIndex((s) => s.id === stage.id)
    const swap = ordered[index + direction]
    if (!swap) return
    const temp = -Math.abs(stage.sort_order * 100 + 1)
    const { error: first } = await supabase
      .from('stages')
      .update({ sort_order: temp })
      .eq('id', stage.id)
    if (first) return setError(first.message)
    const { error: second } = await supabase
      .from('stages')
      .update({ sort_order: stage.sort_order })
      .eq('id', swap.id)
    if (second) return setError(second.message)
    const { error: third } = await supabase
      .from('stages')
      .update({ sort_order: swap.sort_order })
      .eq('id', stage.id)
    if (third) setError(third.message)
    else await reload()
  }

  async function addStage() {
    const name = window.prompt('Stage name')
    if (!name?.trim()) return
    const nextOrder = stages.reduce((max, s) => Math.max(max, s.sort_order), 0) + 1
    const { error: insertError } = await supabase.from('stages').insert({
      name: name.trim(),
      sort_order: nextOrder,
      default_duration_days: 7,
    })
    if (insertError) setError(insertError.message)
    else await reload()
  }

  async function renameStage(stage: Stage) {
    const name = window.prompt('Rename stage', stage.name)
    if (!name?.trim() || name.trim() === stage.name) return
    const { error: updateError } = await supabase
      .from('stages')
      .update({ name: name.trim() })
      .eq('id', stage.id)
    if (updateError) setError(updateError.message)
    else await reload()
  }

  async function removeStage(stage: Stage) {
    if (!window.confirm(`Remove stage “${stage.name}”? Existing agents that use it will block this.`)) {
      return
    }
    const { error: deleteError } = await supabase.from('stages').delete().eq('id', stage.id)
    if (deleteError) setError(deleteError.message)
    else await reload()
  }

  async function updateDuration(stage: Stage, days: number) {
    const { error: updateError } = await supabase
      .from('stages')
      .update({ default_duration_days: days })
      .eq('id', stage.id)
    if (updateError) setError(updateError.message)
    else await reload()
  }

  async function addSubstep(stage: Stage) {
    const name = window.prompt(`Sub-step under ${stage.name}`)
    if (!name?.trim()) return
    const existing = substeps.filter((s) => s.stage_id === stage.id)
    const nextOrder = existing.reduce((max, s) => Math.max(max, s.sort_order), 0) + 1
    const { error: insertError } = await supabase.from('substeps').insert({
      stage_id: stage.id,
      name: name.trim(),
      sort_order: nextOrder,
    })
    if (insertError) setError(insertError.message)
    else await reload()
  }

  async function renameSubstep(step: Substep) {
    const name = window.prompt('Rename sub-step', step.name)
    if (!name?.trim() || name.trim() === step.name) return
    const { error: updateError } = await supabase
      .from('substeps')
      .update({ name: name.trim() })
      .eq('id', step.id)
    if (updateError) setError(updateError.message)
    else await reload()
  }

  async function removeSubstep(step: Substep) {
    if (!window.confirm(`Remove “${step.name}”?`)) return
    const { error: deleteError } = await supabase.from('substeps').delete().eq('id', step.id)
    if (deleteError) setError(deleteError.message)
    else await reload()
  }

  async function updateSubDuration(step: Substep, days: number | null) {
    const { error: updateError } = await supabase
      .from('substeps')
      .update({ default_duration_days: days })
      .eq('id', step.id)
    if (updateError) setError(updateError.message)
    else await reload()
  }

  async function moveSubstep(step: Substep, direction: -1 | 1) {
    const siblings = substeps
      .filter((s) => s.stage_id === step.stage_id)
      .sort((a, b) => a.sort_order - b.sort_order)
    const index = siblings.findIndex((s) => s.id === step.id)
    const swap = siblings[index + direction]
    if (!swap) return
    const { error: first } = await supabase
      .from('substeps')
      .update({ sort_order: swap.sort_order })
      .eq('id', step.id)
    if (first) return setError(first.message)
    const { error: second } = await supabase
      .from('substeps')
      .update({ sort_order: step.sort_order })
      .eq('id', swap.id)
    if (second) setError(second.message)
    else await reload()
  }

  return (
    <div className="space-y-10">
      <p className="text-sm">
        <Link to="/" className="text-ink-400 hover:text-ink-700">
          All agents
        </Link>
      </p>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
          Settings
        </h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Manage the stage and sub-step catalog used when a new request is created.
        </p>
      </div>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-ink-400 text-sm font-semibold tracking-wide uppercase">
              Administrators
            </h3>
            <p className="text-ink-500 dark:text-ink-400 mt-1 text-xs">
              Administrators can edit all tracker data and manage this list.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void addAdmin()}
            className="text-brand-700 dark:text-brand-300 text-sm font-semibold"
          >
            Add administrator
          </button>
        </div>
        <ul className="divide-ink-100 border-ink-200 dark:divide-ink-800 dark:border-ink-800 dark:bg-ink-900 divide-y overflow-hidden rounded-2xl border bg-white">
          {admins.map((entry) => (
            <li key={entry.email} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="text-ink-900 dark:text-ink-50 block text-sm font-medium">
                  {entry.display_name}
                </span>
                <span className="text-ink-400 block truncate text-xs">{entry.email}</span>
              </span>
              <button
                type="button"
                disabled={entry.email.toLowerCase() === admin?.email.toLowerCase()}
                onClick={() => void removeAdmin(entry.email)}
                className="text-xs text-red-500 disabled:cursor-not-allowed disabled:opacity-35 dark:text-red-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide text-ink-400 uppercase">
            Stages
          </h3>
          <button
            type="button"
            onClick={() => void addStage()}
            className="text-sm font-semibold text-brand-700 dark:text-brand-300"
          >
            Add stage
          </button>
        </div>
        {stages.map((stage, index) => {
          const kids = substeps
            .filter((s) => s.stage_id === stage.id)
            .sort((a, b) => a.sort_order - b.sort_order)
          return (
            <article key={stage.id} className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="flex-1 font-semibold text-ink-900 dark:text-ink-50">{stage.name}</p>
                <button type="button" className="text-xs text-ink-500 dark:text-ink-400" onClick={() => void moveStage(stage, -1)} disabled={index === 0}>
                  Up
                </button>
                <button
                  type="button"
                  className="text-xs text-ink-500 dark:text-ink-400"
                  onClick={() => void moveStage(stage, 1)}
                  disabled={index === stages.length - 1}
                >
                  Down
                </button>
                <button type="button" className="text-xs text-ink-500 dark:text-ink-400" onClick={() => void renameStage(stage)}>
                  Rename
                </button>
                <button type="button" className="text-xs text-red-500 dark:text-red-400" onClick={() => void removeStage(stage)}>
                  Remove
                </button>
              </div>
              <label className="mt-3 block text-xs text-ink-500 dark:text-ink-400">
                Default duration (days)
                <input
                  type="number"
                  min={0}
                  defaultValue={stage.default_duration_days}
                  className="ml-2 w-20 rounded-lg border border-ink-200 dark:border-ink-800 px-2 py-1 text-sm"
                  onBlur={(e) => {
                    const days = Number(e.target.value)
                    if (days !== stage.default_duration_days) void updateDuration(stage, days)
                  }}
                />
              </label>
              <ul className="mt-4 space-y-2">
                {kids.map((step) => (
                  <li key={step.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="flex-1 text-ink-800 dark:text-ink-100">{step.name}</span>
                    <button
                      type="button"
                      className="text-xs text-ink-500 dark:text-ink-400"
                      onClick={() => void moveSubstep(step, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="text-xs text-ink-500 dark:text-ink-400"
                      onClick={() => void moveSubstep(step, 1)}
                    >
                      Down
                    </button>
                    <input
                      type="number"
                      min={0}
                      placeholder="days"
                      defaultValue={step.default_duration_days ?? ''}
                      className="w-20 rounded-lg border border-ink-200 dark:border-ink-800 px-2 py-1 text-xs"
                      onBlur={(e) => {
                        const raw = e.target.value
                        const days = raw === '' ? null : Number(raw)
                        if (days !== step.default_duration_days) void updateSubDuration(step, days)
                      }}
                    />
                    <button type="button" className="text-xs text-ink-500 dark:text-ink-400" onClick={() => void renameSubstep(step)}>
                      Rename
                    </button>
                    <button type="button" className="text-xs text-red-500 dark:text-red-400" onClick={() => void removeSubstep(step)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-3 text-sm font-medium text-brand-700 dark:text-brand-300"
                onClick={() => void addSubstep(stage)}
              >
                Add sub-step
              </button>
            </article>
          )
        })}
      </section>

    </div>
  )
}
