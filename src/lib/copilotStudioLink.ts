export function isHttpsUrl(value: string): boolean {
  if (!value) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function copilotStudioLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host || 'Copilot Studio'
  } catch {
    return 'Copilot Studio'
  }
}
