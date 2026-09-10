import { describe, expect, it } from 'vitest'
import { isDigitalRealtyEmail, safeReturnPath } from './auth'

describe('isDigitalRealtyEmail', () => {
  it('accepts Digital Realty addresses without case sensitivity', () => {
    expect(isDigitalRealtyEmail('lauren@digitalrealty.com')).toBe(true)
    expect(isDigitalRealtyEmail(' NABIH@DIGITALREALTY.COM ')).toBe(true)
  })

  it('rejects missing, external, and lookalike domains', () => {
    expect(isDigitalRealtyEmail(null)).toBe(false)
    expect(isDigitalRealtyEmail('person@example.com')).toBe(false)
    expect(isDigitalRealtyEmail('person@evildigitalrealty.com')).toBe(false)
    expect(isDigitalRealtyEmail('person@digitalrealty.com.example.com')).toBe(false)
  })
})

describe('safeReturnPath', () => {
  it('keeps in-app paths', () => {
    expect(safeReturnPath('/')).toBe('/')
    expect(safeReturnPath('/agents/new')).toBe('/agents/new')
  })

  it('rejects missing, off-site, and protocol-relative values', () => {
    expect(safeReturnPath(undefined)).toBe('/')
    expect(safeReturnPath('https://evil.example/')).toBe('/')
    expect(safeReturnPath('//evil.example')).toBe('/')
    expect(safeReturnPath('login')).toBe('/')
  })
})
