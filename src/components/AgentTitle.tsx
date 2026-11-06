import { pctBrowseUrl, titleParts } from '../lib/pctTitle'

type Props = {
  title: string
  sourceUrl?: string | null
  className?: string
  linkClassName?: string
  insideLink?: boolean
  as?: 'h1' | 'h2' | 'h3' | 'span'
}

function openJira(key: string) {
  window.open(pctBrowseUrl(key), '_blank', 'noopener,noreferrer')
}

export function AgentTitle({
  title,
  sourceUrl,
  className,
  linkClassName = 'underline underline-offset-2',
  insideLink = false,
  as: Tag = 'h3',
}: Props) {
  const parts = titleParts(title, sourceUrl)

  return (
    <Tag className={className}>
      {parts.map((part, index) => {
        if (part.kind === 'text') return <span key={index}>{part.text}</span>
        if (insideLink) {
          return (
            <span
              key={`${part.key}-${index}`}
              role="link"
              tabIndex={0}
              className={linkClassName}
              aria-label={`Open ${part.key} in Jira`}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                openJira(part.key)
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                event.stopPropagation()
                openJira(part.key)
              }}
            >
              {part.key}
            </span>
          )
        }
        return (
          <a
            key={`${part.key}-${index}`}
            href={pctBrowseUrl(part.key)}
            target="_blank"
            rel="noreferrer"
            className={linkClassName}
          >
            {part.key}
          </a>
        )
      })}
    </Tag>
  )
}
