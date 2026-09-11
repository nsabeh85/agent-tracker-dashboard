import { useState, type FocusEvent } from 'react'

type Props = {
  name?: string
  required?: boolean
  disabled?: boolean
  defaultValue?: string
  className?: string
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
}

/** Empty until the user picks a date, so a browser default of today is not treated as a choice. */
export function DateInput({
  name,
  required,
  disabled,
  defaultValue = '',
  className,
  onBlur,
}: Props) {
  const [value, setValue] = useState(defaultValue)
  const [type, setType] = useState<'date' | 'text'>(defaultValue ? 'date' : 'text')

  return (
    <input
      type={type}
      name={name}
      value={value}
      required={required}
      disabled={disabled}
      autoComplete="off"
      placeholder="Select a date"
      className={className}
      onFocus={() => setType('date')}
      onChange={(event) => setValue(event.target.value)}
      onBlur={(event) => {
        if (!event.target.value) setType('text')
        onBlur?.(event)
      }}
    />
  )
}
