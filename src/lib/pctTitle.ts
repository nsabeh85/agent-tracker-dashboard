import { intakeByTitle, intakeTitle } from './jiraIntake'

const PCT_KEY = /PCT-\d+/i

export const PCT_BROWSE_ORIGIN = 'https://digitalrealty-cdo.atlassian.net/browse'

export type TitlePart = { kind: 'text'; text: string } | { kind: 'pct'; key: string }

export function pctBrowseUrl(key: string): string {
  return `${PCT_BROWSE_ORIGIN}/${key.toUpperCase()}`
}

export function pctKey(value: string | null | undefined): string | null {
  return value?.match(PCT_KEY)?.[0].toUpperCase() ?? null
}

function stripLeadingKey(name: string, key: string | null): string {
  if (!key) return name.trim()
  return name.replace(new RegExp(`^\\s*${key}\\b\\s*[-–—.:]?\\s*`, 'i'), '').trim()
}

function stripKeyToken(title: string, key: string | null): string {
  if (!key) return title.trim()
  return title
    .replace(new RegExp(`\\b${key}\\b`, 'i'), ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—.:]+|[\s\-–—.:]+$/g, '')
    .trim()
}

/** PCT key first, then the CDO intake name when this request is one of those issues. */
export function resolveAgentTitle(
  title: string,
  sourceUrl?: string | null,
): { key: string | null; name: string } {
  const keyFromUrl = pctKey(sourceUrl)
  const keyFromTitle = pctKey(title)
  const key = keyFromUrl ?? keyFromTitle
  const named = key ? undefined : intakeByTitle(title)
  const intake = (key ? intakeTitle(key) : undefined) ?? named?.title
  const resolvedKey = key ?? named?.key ?? null
  if (intake) return { key: resolvedKey, name: stripLeadingKey(intake, resolvedKey) }
  return { key: resolvedKey, name: stripKeyToken(title, resolvedKey) }
}

export function titleParts(title: string, sourceUrl?: string | null): TitlePart[] {
  const { key, name } = resolveAgentTitle(title, sourceUrl)
  const parts: TitlePart[] = []
  if (key) parts.push({ kind: 'pct', key })
  if (name) {
    if (key) parts.push({ kind: 'text', text: ' ' })
    parts.push({ kind: 'text', text: name })
  }
  if (parts.length === 0) parts.push({ kind: 'text', text: title })
  return parts
}

export function presentedTitle(title: string, sourceUrl?: string | null): string {
  return titleParts(title, sourceUrl)
    .map((part) => (part.kind === 'pct' ? part.key : part.text))
    .join('')
}

/** Name saved on the agent. The PCT key stays on the source link when that link exists. */
export function editableTitle(title: string, sourceUrl?: string | null): string {
  const { key, name } = resolveAgentTitle(title, sourceUrl)
  if (!name) return title
  if (key && !pctKey(sourceUrl)) return `${key} ${name}`
  return name
}
