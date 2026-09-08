import type { Owner } from '../types/database'

type Props = {
  owners: Owner[]
  selectedIds: string[]
  onChange: (ownerIds: string[]) => void
  label?: string
  disabled?: boolean
  required?: boolean
}

export function OwnerMultiSelect({
  owners,
  selectedIds,
  onChange,
  label = 'Owners',
  disabled = false,
  required = false,
}: Props) {
  const selected = new Set(selectedIds)
  const selectedNames = owners
    .filter((owner) => selected.has(owner.id))
    .map((owner) => owner.full_name)

  function toggle(ownerId: string) {
    if (selected.has(ownerId)) {
      if (required && selected.size === 1) return
      onChange(selectedIds.filter((id) => id !== ownerId))
      return
    }
    onChange([...selectedIds, ownerId])
  }

  return (
    <details className="group relative">
      <summary
        className={[
          'border-ink-200 focus-visible:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border bg-white px-2 py-1.5 text-sm outline-none',
          disabled ? 'pointer-events-none opacity-50' : '',
        ].join(' ')}
      >
        <span className={selectedNames.length ? '' : 'text-ink-400'}>
          {selectedNames.length ? selectedNames.join(', ') : `Select ${label.toLowerCase()}`}
        </span>
        <span className="text-ink-400 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="border-ink-200 dark:border-ink-700 dark:bg-ink-900 absolute z-20 mt-1 max-h-56 w-full min-w-56 overflow-auto rounded-lg border bg-white p-2 shadow-xl">
        {owners.map((owner) => (
          <label
            key={owner.id}
            className="hover:bg-ink-50 dark:hover:bg-ink-800 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.has(owner.id)}
              onChange={() => toggle(owner.id)}
              className="accent-brand-600"
            />
            <span>{owner.full_name}</span>
          </label>
        ))}
        {owners.length === 0 ? (
          <p className="text-ink-400 px-2 py-1.5 text-sm">No active owners</p>
        ) : null}
      </div>
    </details>
  )
}
