const GRAPH_SCOPE = 'https://graph.microsoft.com/.default'

export function savingsRecipients() {
  const primary = (process.env.SAVINGS_ALERT_PRIMARY || '').trim().toLowerCase()
  const secondary = (process.env.SAVINGS_ALERT_SECONDARY || '').trim().toLowerCase()
  return {
    primary,
    secondary: secondary && secondary !== primary ? secondary : '',
  }
}

export function mailConfigured() {
  return Boolean(
    process.env.GRAPH_TENANT_ID &&
      process.env.GRAPH_CLIENT_ID &&
      process.env.GRAPH_CLIENT_SECRET &&
      process.env.SAVINGS_MAIL_FROM,
  )
}

async function graphToken() {
  const body = new URLSearchParams({
    client_id: process.env.GRAPH_CLIENT_ID,
    client_secret: process.env.GRAPH_CLIENT_SECRET,
    scope: GRAPH_SCOPE,
    grant_type: 'client_credentials',
  })
  const response = await fetch(
    `https://login.microsoft.com/${process.env.GRAPH_TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body },
  )
  if (!response.ok) throw new Error('mail_token_failed')
  const payload = await response.json()
  if (!payload.access_token) throw new Error('mail_token_failed')
  return payload.access_token
}

export async function sendSavingsEmail({ to, cc, subject, text }) {
  if (!mailConfigured() || !to) return { sent: false, reason: 'mail_not_configured' }
  const token = await graphToken()
  const message = {
    subject,
    body: { contentType: 'Text', content: text },
    toRecipients: [{ emailAddress: { address: to } }],
    ccRecipients: cc ? [{ emailAddress: { address: cc } }] : [],
  }
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(process.env.SAVINGS_MAIL_FROM)}/sendMail`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: false }),
    },
  )
  if (!response.ok) throw new Error('mail_send_failed')
  return { sent: true }
}
