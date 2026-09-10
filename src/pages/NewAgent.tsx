import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { OwnerMultiSelect } from '../components/OwnerMultiSelect'
import { useCatalog, useRealtimeTick } from '../hooks/useTracker'
import { isHttpsUrl } from '../lib/sourceLink'
import { supabase } from '../lib/supabase'
import { parseSavingsAmount } from '../lib/savings'
import type { AgentPriority } from '../types/database'

export function NewAgentPage() {
  const navigate = useNavigate()
  const tick = useRealtimeTick()
  const { owners: ownerCatalog, departments, error: catalogError } = useCatalog(tick)
  const owners = ownerCatalog.filter((owner) => owner.active)
  const activeDepartments = departments.filter((department) => department.active)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [ownerIds, setOwnerIds] = useState<string[]>([])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (ownerIds.length === 0) {
      setError('Select at least one owner.')
      return
    }
    const form = new FormData(event.currentTarget)
    const sourceUrl = String(form.get('source_url') ?? '').trim()
    if (!isHttpsUrl(sourceUrl)) {
      setError('Source request must be a valid HTTPS URL.')
      return
    }
    setSaving(true)
    setError(null)
    const goLive = String(form.get('target_go_live') ?? '')
    const studioUrl = String(form.get('copilot_studio_url') ?? '').trim()
    if (!isHttpsUrl(studioUrl)) {
      setSaving(false)
      setError('Copilot Studio link must be a valid HTTPS URL.')
      return
    }
    const savings = parseSavingsAmount(String(form.get('savings_amount') ?? ''))
    if (savings === 'invalid') {
      setSaving(false)
      setError('Money saved must be a number 0 or greater.')
      return
    }
    const { data, error: rpcError } = await supabase.rpc('create_agent_with_owners', {
      p_title: String(form.get('title') ?? '').trim(),
      p_requester_name: String(form.get('requester_name') ?? '').trim(),
      p_requester_department: String(form.get('requester_department') ?? '').trim(),
      p_description: String(form.get('description') ?? '').trim(),
      p_priority: String(form.get('priority') ?? 'medium') as AgentPriority,
      p_target_go_live: goLive || null,
      p_owner_ids: ownerIds,
    })
    if (rpcError) {
      setSaving(false)
      setError(rpcError.message)
      return
    }
    if (data) {
      const cadence =
        String(form.get('savings_cadence') ?? 'yearly') === 'monthly' ? 'monthly' : 'yearly'
      const { error: extraError } = await supabase
        .from('agents')
        .update({
          source_url: sourceUrl || null,
          savings_amount: savings,
          savings_cadence: cadence,
          copilot_studio_url: studioUrl || null,
        })
        .eq('id', data)
      if (extraError) {
        setSaving(false)
        setError(extraError.message)
        return
      }
    }
    setSaving(false)
    if (data) navigate(`/agents/${data}`)
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <p className="text-sm">
        <Link to="/" className="text-ink-400 hover:text-ink-700">
          All agents
        </Link>
      </p>
      <h2 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">New agent</h2>
      <p className="text-sm text-ink-500 dark:text-ink-400">
        Saving copies the current stage and sub-step catalog onto this request so later
        template edits do not rewrite history.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5">
        <Input name="title" label="Title" required />
        <Input name="requester_name" label="Requester name" required />
        <label className="block text-xs font-medium text-ink-500 dark:text-ink-400">
          Department
          <select
            name="requester_department"
            required
            defaultValue=""
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-800"
          >
            <option value="" disabled>
              Select a department
            </option>
            {activeDepartments.map((department) => (
              <option key={department.id} value={department.name}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-ink-500 dark:text-ink-400">
          Description
          <textarea
            name="description"
            rows={4}
            className="mt-1 w-full rounded-xl border border-ink-200 dark:border-ink-800 px-3 py-2 text-sm text-ink-800 dark:text-ink-100"
          />
        </label>
        <label className="block text-xs font-medium text-ink-500 dark:text-ink-400">
          Source request link (optional)
          <input
            type="url"
            name="source_url"
            placeholder="https://digitalrealty-cdo.atlassian.net/browse/PCT-123"
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-800 dark:border-ink-800 dark:text-ink-100"
          />
        </label>
        <label className="block text-xs font-medium text-ink-500 dark:text-ink-400">
          Priority
          <select
            name="priority"
            defaultValue="medium"
            className="mt-1 w-full rounded-xl border border-ink-200 dark:border-ink-800 px-3 py-2 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-ink-500 dark:text-ink-400">
          Target go live
          <input
            type="date"
            name="target_go_live"
            className="mt-1 w-full rounded-xl border border-ink-200 dark:border-ink-800 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-ink-500 dark:text-ink-400">
          Owners
          <span className="mt-1 block">
            <OwnerMultiSelect
              owners={owners}
              selectedIds={ownerIds}
              onChange={setOwnerIds}
              required
            />
          </span>
        </label>
        <label className="block text-xs font-medium text-ink-500 dark:text-ink-400">
          Money saved (optional)
          <input
            type="number"
            name="savings_amount"
            min={0}
            step="0.01"
            placeholder="e.g. 12000"
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-800 dark:border-ink-800 dark:text-ink-100"
          />
        </label>
        <label className="block text-xs font-medium text-ink-500 dark:text-ink-400">
          Savings period
          <select
            name="savings_cadence"
            defaultValue="yearly"
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-800"
          >
            <option value="yearly">Yearly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-ink-500 dark:text-ink-400">
          Copilot Studio link (optional)
          <input
            type="url"
            name="copilot_studio_url"
            placeholder="https://copilotstudio.microsoft.com/..."
            className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-800 dark:border-ink-800 dark:text-ink-100"
          />
        </label>
        {error || catalogError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error ?? catalogError}</p>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Create agent
        </button>
      </form>
    </div>
  )
}

function Input({
  name,
  label,
  required,
}: {
  name: string
  label: string
  required?: boolean
}) {
  return (
    <label className="block text-xs font-medium text-ink-500 dark:text-ink-400">
      {label}
      <input
        name={name}
        required={required}
        className="mt-1 w-full rounded-xl border border-ink-200 dark:border-ink-800 px-3 py-2 text-sm text-ink-800 dark:text-ink-100"
      />
    </label>
  )
}
