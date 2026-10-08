import { describe, expect, it } from 'vitest'
import { hashPassword, signJwt, verifyJwt, verifyPassword } from './authCrypto.mjs'

describe('azure password hashes', () => {
  it('accepts the password that was hashed and rejects a different one', () => {
    const stored = hashPassword('correct-horse')
    expect(verifyPassword('correct-horse', stored)).toBe(true)
    expect(verifyPassword('wrong-horse', stored)).toBe(false)
    expect(verifyPassword('correct-horse', 'not-a-hash')).toBe(false)
  })
})

describe('azure session tokens', () => {
  it('round-trips the claims and rejects a tampered token', () => {
    const token = signJwt({ role: 'authenticated', email: 'person@digitalrealty.com' }, 'test-secret', 60)
    const claims = verifyJwt(token, 'test-secret')
    expect(claims?.email).toBe('person@digitalrealty.com')
    expect(claims?.role).toBe('authenticated')
    expect(verifyJwt(token, 'other-secret')).toBeNull()
    expect(verifyJwt(`${token}x`, 'test-secret')).toBeNull()
  })
})
