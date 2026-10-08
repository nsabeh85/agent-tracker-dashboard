import { describe, expect, it } from 'vitest'
import { verifyJwt } from './authCrypto.mjs'
import { dataApiAuthorization, userFromPrincipal, userFromPrincipalHeader } from './clientPrincipal.mjs'

describe('static web apps principal', () => {
  it('reads a Digital Realty email from claims when userDetails is a display name', () => {
    expect(
      userFromPrincipal({
        userId: '11111111-1111-1111-1111-111111111111',
        userDetails: 'Lauren Lawhon',
        claims: [{ typ: 'preferred_username', val: 'LLawhon@DigitalRealty.com' }],
      }),
    ).toEqual({
      email: 'llawhon@digitalrealty.com',
      id: '11111111-1111-1111-1111-111111111111',
    })
  })

  it('rejects a principal that is not a Digital Realty account', () => {
    expect(userFromPrincipal({ userDetails: 'person@example.com', userId: 'abc' })).toBeNull()
    expect(userFromPrincipalHeader('not-base64-json')).toBeNull()
    expect(userFromPrincipalHeader('')).toBeNull()
  })

  it('issues a short data token for the signed-in user', () => {
    const header = dataApiAuthorization(
      { email: 'llawhon@digitalrealty.com', id: 'user-1' },
      'test-secret',
    )
    const claims = verifyJwt(header.replace(/^Bearer /, ''), 'test-secret')
    expect(claims?.role).toBe('authenticated')
    expect(claims?.email).toBe('llawhon@digitalrealty.com')
    expect(dataApiAuthorization(null, 'test-secret')).toBe('')
  })
})
