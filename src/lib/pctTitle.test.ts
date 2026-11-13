import { describe, expect, it } from 'vitest'
import { editableTitle, pctBrowseUrl, presentedTitle, titleParts } from './pctTitle'

const formBridge = 'AI-Powered Tax Document Translation Agent with OCR and Layout Preservation'

describe('PCT title links', () => {
  it('replaces a renamed agent with the PCT link and the CDO intake name', () => {
    expect(titleParts('FIN-08 – PCT-555 (FormBridge)')).toEqual([
      { kind: 'pct', key: 'PCT-555' },
      { kind: 'text', text: ' ' },
      { kind: 'text', text: formBridge },
    ])
  })

  it('uses the intake name when the source link carries the PCT key', () => {
    expect(
      presentedTitle(
        'Executive Request – Equinix Analyst Bot',
        'https://digitalrealty-cdo.atlassian.net/browse/PCT-49',
      ),
    ).toBe('PCT-49 Executive Request - Equinix Analyst Bot')
  })

  it('matches an older title that uses a different dash', () => {
    expect(presentedTitle('Executive Request – Equinix Analyst Bot')).toBe(
      'PCT-49 Executive Request - Equinix Analyst Bot',
    )
  })

  it('shows the backlog HR notetaker as its PCT key and intake name', () => {
    expect(presentedTitle('HR-17 Recruiter Notetaker')).toBe('PCT-489 Recruiter - Notetaker')
    expect(titleParts('HR-17 Recruiter Notetaker')[0]).toEqual({ kind: 'pct', key: 'PCT-489' })
  })

  it('leaves a request that is not on the CDO intake unchanged', () => {
    expect(titleParts('Visier Integration to Copilot')).toEqual([
      { kind: 'text', text: 'Visier Integration to Copilot' },
    ])
  })

  it('stores the intake name when the Jira link already has the key', () => {
    expect(
      editableTitle(
        'FIN-08 – PCT-555 (FormBridge)',
        'https://digitalrealty-cdo.atlassian.net/browse/PCT-555',
      ),
    ).toBe(formBridge)
  })

  it('builds the Jira browse URL', () => {
    expect(pctBrowseUrl('pct-555')).toBe(
      'https://digitalrealty-cdo.atlassian.net/browse/PCT-555',
    )
  })
})
