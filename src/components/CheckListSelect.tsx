type Option = {
  value: string
  label: string
}

type Props = {
  label: string
  emptyLabel: string
  options: Option[]
  selected: string[]
  onChange: (values: string[]) => void
}

export function CheckListSelect({ label, emptyLabel, options, selected, onChange }: Props) {
  const chosen = new Set(selected)
  const summary =
    selected.length === 0
      ? emptyLabel
      : options
          .filter((option) => chosen.has(option.value))
          .map((option) => option.label)
          .join(', ')

  function toggle(value: string) {
    if (chosen.has(value)) onChange(selected.filter((item) => item !== value))
    else onChange([...selected, value])
  }

  return (
    <div className="flex min-w-0 flex-col gap-1 md:min-w-36">
      <span className="text-ink-400 text-[10px] font-bold tracking-[0.12em] uppercase">
        {label}
      </span>
      <details className="group relative">
        <summary className="border-ink-200 text-ink-800 hover:border-brand-300 focus:border-brand-500 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 dark:hover:border-brand-500 dark:focus:ring-brand-500/20 flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-medium transition outline-none focus:ring-4">
          <span className="truncate">{summary}</span>
          <span className="text-ink-400 shrink-0 transition group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </summary>
        <div className="border-ink-200 dark:border-ink-700 dark:bg-ink-900 absolute z-20 mt-1 max-h-56 w-full min-w-52 overflow-auto rounded-xl border bg-white p-2 shadow-xl">
          {options.map((option) => (
            <label
              key={option.value}
              className="hover:bg-ink-50 dark:hover:bg-ink-800 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                checked={chosen.has(option.value)}
                onChange={() => toggle(option.value)}
                className="accent-brand-600"
              />
              <span>{option.label}</span>
            </label>
          ))}
          {options.length === 0 ? (
            <p className="text-ink-400 px-2 py-1.5 text-sm">None available</p>
          ) : null}
        </div>
      </details>
    </div>
  )
}
