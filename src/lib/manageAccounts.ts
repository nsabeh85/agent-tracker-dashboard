/**
 * Shared logic for the admin-only `manage-accounts` Edge Function and the
 * Settings page. Pure functions only; no Supabase client here so vitest and
 * Deno can both import it.
 */

export const TEMPORARY_PASSWORD_LENGTH = 20

/** No 0/O, 1/l/I so a password read aloud or retyped is not misheard. */
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

export type AccountAction = 'list' | 'create' | 'reset_password' | 'remove'

export type AccountRequest =
  | { action: 'list' }
  | { action: 'create'; email: string }
  | { action: 'reset_password'; email: string }
  | { action: 'remove'; email: string }

export type AccountSummary = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

export type AccountRequestError =
  | 'invalid_action'
  | 'invalid_email'
  | 'not_digital_realty_email'

export type ParseAccountRequestResult =
  | { ok: true; value: AccountRequest }
  | { ok: false; reason: AccountRequestError }

export function isDigitalRealtyEmail(email: string | null | undefined): boolean {
  return /@digitalrealty\.com$/i.test(email?.trim() ?? '')
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function parseAccountRequest(payload: unknown): ParseAccountRequestResult {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, reason: 'invalid_action' }
  }
  const body = payload as Record<string, unknown>
  const action = body.action
  if (action === 'list') return { ok: true, value: { action } }
  if (action !== 'create' && action !== 'reset_password' && action !== 'remove') {
    return { ok: false, reason: 'invalid_action' }
  }
  if (typeof body.email !== 'string' || !body.email.trim()) {
    return { ok: false, reason: 'invalid_email' }
  }
  const email = normalizeEmail(body.email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: 'invalid_email' }
  }
  if (!isDigitalRealtyEmail(email)) {
    return { ok: false, reason: 'not_digital_realty_email' }
  }
  return { ok: true, value: { action, email } }
}

/**
 * Random temporary password from a cryptographic source. Rejection sampling
 * keeps every character equally likely instead of biasing toward the start of
 * the alphabet.
 */
export function generateTemporaryPassword(
  length: number = TEMPORARY_PASSWORD_LENGTH,
  randomBytes: (size: number) => Uint8Array = (size) =>
    crypto.getRandomValues(new Uint8Array(size)),
): string {
  const alphabet = PASSWORD_ALPHABET
  const limit = 256 - (256 % alphabet.length)
  let result = ''
  while (result.length < length) {
    const bytes = randomBytes(length * 2)
    for (const byte of bytes) {
      if (byte >= limit) continue
      result += alphabet[byte % alphabet.length]
      if (result.length === length) break
    }
  }
  return result
}

export function isAllowedPasswordCharacter(character: string): boolean {
  return PASSWORD_ALPHABET.includes(character)
}
