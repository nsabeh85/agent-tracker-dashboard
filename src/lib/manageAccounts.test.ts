import { describe, expect, it } from 'vitest'
import {
  TEMPORARY_PASSWORD_LENGTH,
  generateTemporaryPassword,
  isAllowedPasswordCharacter,
  parseAccountRequest,
} from './manageAccounts'

describe('parseAccountRequest', () => {
  it('accepts list without an email', () => {
    expect(parseAccountRequest({ action: 'list' })).toEqual({
      ok: true,
      value: { action: 'list' },
    })
  })

  it('normalizes the email for create, reset, and remove', () => {
    for (const action of ['create', 'reset_password', 'remove'] as const) {
      expect(parseAccountRequest({ action, email: '  ALewis@DigitalRealty.com ' })).toEqual({
        ok: true,
        value: { action, email: 'alewis@digitalrealty.com' },
      })
    }
  })

  it('rejects unknown actions and bad payloads', () => {
    expect(parseAccountRequest({ action: 'delete_everything' })).toEqual({
      ok: false,
      reason: 'invalid_action',
    })
    expect(parseAccountRequest(null)).toEqual({ ok: false, reason: 'invalid_action' })
    expect(parseAccountRequest('create')).toEqual({ ok: false, reason: 'invalid_action' })
  })

  it('rejects missing or malformed emails', () => {
    expect(parseAccountRequest({ action: 'create' })).toEqual({
      ok: false,
      reason: 'invalid_email',
    })
    expect(parseAccountRequest({ action: 'create', email: 'not an email' })).toEqual({
      ok: false,
      reason: 'invalid_email',
    })
  })

  it('rejects addresses outside digitalrealty.com', () => {
    expect(parseAccountRequest({ action: 'create', email: 'someone@example.com' })).toEqual({
      ok: false,
      reason: 'not_digital_realty_email',
    })
    expect(
      parseAccountRequest({ action: 'create', email: 'someone@digitalrealty.com.evil.io' }),
    ).toEqual({ ok: false, reason: 'not_digital_realty_email' })
  })
})

describe('generateTemporaryPassword', () => {
  it('produces the configured length from the allowed alphabet', () => {
    const password = generateTemporaryPassword()
    expect(password).toHaveLength(TEMPORARY_PASSWORD_LENGTH)
    for (const character of password) {
      expect(isAllowedPasswordCharacter(character)).toBe(true)
    }
  })

  it('never emits look-alike characters', () => {
    const password = generateTemporaryPassword(500)
    expect(password).not.toMatch(/[0O1lI]/)
  })

  it('skips bytes outside the unbiased range', () => {
    let calls = 0
    const randomBytes = (size: number) => {
      calls += 1
      // First call: all 255s (rejected). Second call: all zeros (accepted).
      return new Uint8Array(size).fill(calls === 1 ? 255 : 0)
    }
    const password = generateTemporaryPassword(4, randomBytes)
    expect(password).toBe('AAAA')
    expect(calls).toBe(2)
  })

  it('does not repeat across calls', () => {
    const seen = new Set(Array.from({ length: 20 }, () => generateTemporaryPassword()))
    expect(seen.size).toBe(20)
  })
})
