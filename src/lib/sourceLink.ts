export function sourceLabel(sourceUrl: string): string {
  try {
    const url = new URL(sourceUrl)
    const key = url.pathname.match(/\/(PCT-\d+)(?:\/)?$/i)?.[1]
    return key?.toUpperCase() ?? url.hostname
  } catch {
    return 'Source request'
  }
}

export function descriptionWithoutSource(
  description: string,
  sourceUrl: string | null,
): string {
  let cleaned = description.trim()
  if (!sourceUrl) return cleaned

  cleaned = cleaned.replaceAll(sourceUrl, '').trim()
  const label = sourceLabel(sourceUrl)
  if (/^PCT-\d+$/i.test(label)) {
    cleaned = cleaned.replace(new RegExp(`^${label}[.:\\s-]*`, 'i'), '').trim()
  }
  return cleaned
}

export function isHttpsUrl(value: string): boolean {
  if (!value) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}
