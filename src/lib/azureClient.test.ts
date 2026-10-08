import { describe, expect, it } from 'vitest'
import { emailFromPrincipal } from './azureClient'

describe('emailFromPrincipal', () => {
  it('prefers userDetails and falls back to a Digital Realty claim', () => {
    expect(emailFromPrincipal({ userDetails: 'Person@DigitalRealty.com' })).toBe(
      'person@digitalrealty.com',
    )
    expect(
      emailFromPrincipal({
        userDetails: 'Person Name',
        claims: [{ val: 'Person@DigitalRealty.com' }],
      }),
    ).toBe('person@digitalrealty.com')
    expect(emailFromPrincipal({ userDetails: 'person@example.com' })).toBe('')
    expect(emailFromPrincipal(null)).toBe('')
  })
})
