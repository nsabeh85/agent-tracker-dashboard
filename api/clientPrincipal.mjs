import { signJwt } from './authCrypto.mjs'

const DATA_TOKEN_TTL_SECONDS = 300

export function digitalRealtyEmail(value) {
  const email = String(value || '').trim().toLowerCase()
  return /@digitalrealty\.com$/.test(email) ? email : ''
}

export function userFromPrincipal(principal) {
  if (!principal || typeof principal !== 'object') return null
  const claimEmail = Array.isArray(principal.claims)
    ? principal.claims.map((claim) => digitalRealtyEmail(claim?.val)).find(Boolean)
    : ''
  const email = digitalRealtyEmail(principal.userDetails) || claimEmail || ''
  if (!email) return null
  return { email, id: String(principal.userId || email) }
}

export function userFromPrincipalHeader(raw) {
  if (typeof raw !== 'string' || !raw) return null
  try {
    return userFromPrincipal(JSON.parse(Buffer.from(raw, 'base64').toString('utf8')))
  } catch {
    return null
  }
}

export function dataApiAuthorization(user, secret) {
  if (!user || !secret) return ''
  const token = signJwt(
    { role: 'authenticated', email: user.email, sub: user.id },
    secret,
    DATA_TOKEN_TTL_SECONDS,
  )
  return `Bearer ${token}`
}
