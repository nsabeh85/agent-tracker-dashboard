import { describe, expect, it } from 'vitest'
import { copilotStudioLabel, isHttpsUrl } from './copilotStudioLink'

describe('copilotStudioLink', () => {
  it('accepts empty values and HTTPS URLs only', () => {
    expect(isHttpsUrl('')).toBe(true)
    expect(isHttpsUrl('https://copilotstudio.microsoft.com/environments/abc/bots/legal')).toBe(
      true,
    )
    expect(isHttpsUrl('http://copilotstudio.microsoft.com/bot')).toBe(false)
    expect(isHttpsUrl('not-a-url')).toBe(false)
  })

  it('labels a Copilot Studio host for the jump link', () => {
    expect(
      copilotStudioLabel('https://copilotstudio.microsoft.com/environments/abc/bots/legal'),
    ).toBe('copilotstudio.microsoft.com')
  })
})
