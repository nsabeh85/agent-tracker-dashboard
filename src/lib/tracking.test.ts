import { describe, expect, it } from 'vitest'
import { demoAgents } from './demoData'
import {
  isEmail,
  isTrackingToken,
  isUuid,
  trackingMailto,
  trackingPath,
  trackingUrl,
} from './tracking'

describe('trackingPath', () => {
  it('builds a public tracker route from the token', () => {
    expect(trackingPath('abc123def456abc1')).toBe('/track/abc123def456abc1')
  })

  it('encodes reserved characters in the token', () => {
    expect(trackingPath('a/b')).toBe('/track/a%2Fb')
  })
})

describe('trackingUrl', () => {
  it('joins origin and path without a double slash', () => {
    expect(trackingUrl('https://tracker.example.com/', 'tokentokentoken12')).toBe(
      'https://tracker.example.com/track/tokentokentoken12',
    )
  })
})

describe('isTrackingToken', () => {
  it('accepts hex tokens from the database default', () => {
    expect(isTrackingToken('a'.repeat(32))).toBe(true)
  })

  it('rejects empty, short, or path-like values', () => {
    expect(isTrackingToken('')).toBe(false)
    expect(isTrackingToken('short')).toBe(false)
    expect(isTrackingToken('../agents')).toBe(false)
  })
})

describe('isUuid', () => {
  it('accepts an agent id so it can back the link before the migration', () => {
    expect(isUuid('c88633bd-65dc-47f2-b7db-5c9f044fe45b')).toBe(true)
    expect(isTrackingToken('c88633bd-65dc-47f2-b7db-5c9f044fe45b')).toBe(true)
  })

  it('rejects hex tokens and junk', () => {
    expect(isUuid('a'.repeat(32))).toBe(false)
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid('')).toBe(false)
  })
})

describe('isEmail', () => {
  it('accepts a normal work address', () => {
    expect(isEmail('chris.sharp@example.com')).toBe(true)
  })

  it('rejects empty or incomplete values', () => {
    expect(isEmail('')).toBe(false)
    expect(isEmail('not-an-email')).toBe(false)
    expect(isEmail('missing@domain')).toBe(false)
  })
})

describe('trackingMailto', () => {
  it('addresses the BU and includes the tracking URL', () => {
    const href = trackingMailto({
      to: 'bu@example.com',
      title: 'Equinix Analyst Bot',
      url: 'https://tracker.example.com/track/tokentokentoken12',
      requesterName: 'Chris Sharp',
    })
    expect(href.startsWith('mailto:bu%40example.com?')).toBe(true)
    const query = href.slice(href.indexOf('?') + 1)
    const params = new URLSearchParams(query.replace(/\+/g, '%20'))
    expect(params.get('subject')).toContain('Equinix Analyst Bot')
    expect(params.get('body')).toContain('https://tracker.example.com/track/tokentokentoken12')
    expect(params.get('body')).toContain('Hi Chris')
  })
})

describe('demo public tokens', () => {
  it('gives each preview agent a unique valid token', () => {
    const tokens = demoAgents.map((agent) => agent.public_token)
    expect(new Set(tokens).size).toBe(tokens.length)
    expect(tokens.every(isTrackingToken)).toBe(true)
  })
})
