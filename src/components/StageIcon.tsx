type Props = {
  index: number
  className?: string
}

/** Icons follow catalog position, so a renamed stage keeps a sensible glyph. */
const PATHS = [
  'M3 13h4l1.5 2.5h7L17 13h4v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm2.6-8.4A2 2 0 0 1 7.5 3h9a2 2 0 0 1 1.9 1.6L20.3 11h-3.6l-1.5 2.5h-6.4L7.3 11H3.7l1.9-6.4Z',
  'M10.5 3a7.5 7.5 0 1 1-4.6 13.4l-3.2 3.2a1.2 1.2 0 1 1-1.7-1.7l3.2-3.2A7.5 7.5 0 0 1 10.5 3Zm0 2.4a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2Z',
  'M14.7 2.6a5.6 5.6 0 0 0-5 8.1l-6.4 6.4a2.1 2.1 0 0 0 3 3l6.4-6.4a5.6 5.6 0 0 0 7-7.3l-2.9 2.9-2.3-.6-.6-2.3 2.9-2.9a5.6 5.6 0 0 0-2.1-.9Z',
  'M9 2.5h6a1 1 0 0 1 0 2h-.5v4.2l4.7 8.2A2.6 2.6 0 0 1 16.9 21H7.1a2.6 2.6 0 0 1-2.3-4.1l4.7-8.2V4.5H9a1 1 0 1 1 0-2Zm1.5 2v4.7L8.7 12.4h6.6L13.5 9.2V4.5h-3Z',
  'M13.6 2.4c3.4.5 6 3.1 6.5 6.5.4 2.9-.8 5.7-3 7.5l.4 3.4a1.1 1.1 0 0 1-1.7 1l-2.9-1.8-2.9 1.8a1.1 1.1 0 0 1-1.7-1l.4-3.4c-2.2-1.8-3.4-4.6-3-7.5.5-3.4 3.1-6 6.5-6.5a8 8 0 0 1 1.4 0ZM12 6.2a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Z',
]

export function StageIcon({ index, className }: Props) {
  const path = PATHS[index % PATHS.length]
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path fill="currentColor" d={path} />
    </svg>
  )
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12.5 10 17.5 19 7"
      />
    </svg>
  )
}
