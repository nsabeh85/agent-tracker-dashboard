/** Path for the public, no-login tracker page for a single request. */
export function trackingPath(token: string): string {
  return `/track/${encodeURIComponent(token)}`
}

export function trackingUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}${trackingPath(token)}`
}

export function isTrackingToken(value: string | undefined): value is string {
  if (!value) return false
  return /^[a-zA-Z0-9_-]{16,64}$/.test(value)
}

/** Agent UUIDs double as tracking tokens until the public_token migration is applied. */
export function isUuid(value: string | undefined): value is string {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Prefills the admin's mail client so the tracking URL is sent from their inbox. */
export function trackingMailto(args: {
  to: string
  title: string
  url: string
  requesterName?: string
}): string {
  const to = args.to.trim()
  const first = args.requesterName?.trim().split(/\s+/)[0]
  const subject = `Track your agent request: ${args.title}`
  const body = [
    `Hi${first ? ` ${first}` : ''},`,
    '',
    `You can follow progress on “${args.title}” here (no login required):`,
    args.url,
    '',
    'This page is only for this request. Bookmark the link and check back for updates — posting a question does not email the team.',
    '',
    'Thanks,',
    'PCT team',
  ].join('\n')
  const params = [
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body)}`,
  ].join('&')
  return `mailto:${encodeURIComponent(to)}?${params}`
}
