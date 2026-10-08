import { describe, expect, it } from 'vitest'
import { emailFromPrincipal, restUrl } from './azureClient'

describe('restUrl', () => {
  it('turns a same-origin API path into a full URL', () => {
    expect(restUrl('/api', 'https://tracker.example.net')).toBe(
      'https://tracker.example.net/api/rest/v1',
    )
    expect(restUrl('https://api.example.net', 'https://tracker.example.net')).toBe(
      'https://api.example.net/rest/v1',
    )
  })
})

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
