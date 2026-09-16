import { describe, expect, it } from 'vitest'
import { containerWidthClass, isWideRoute, normalizePath } from './layoutWidth'

describe('normalizePath', () => {
  it('treats a trailing slash and an empty path as the root', () => {
    expect(normalizePath('/')).toBe('/')
    expect(normalizePath('')).toBe('/')
    expect(normalizePath('/agents/abc/')).toBe('/agents/abc')
  })
})

describe('containerWidthClass', () => {
  it('gives the dashboard the wide landscape container', () => {
    expect(isWideRoute('/')).toBe(true)
    expect(containerWidthClass('/')).toBe('max-w-[1600px]')
    expect(containerWidthClass('')).toBe('max-w-[1600px]')
  })

  it('keeps single-record pages in a narrow vertical column', () => {
    for (const path of ['/agents/abc', '/agents/new', '/settings', '/login']) {
      expect(isWideRoute(path)).toBe(false)
      expect(containerWidthClass(path)).toBe('max-w-4xl')
    }
  })
})
