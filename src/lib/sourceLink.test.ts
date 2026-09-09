import { describe, expect, it } from 'vitest'
import { descriptionWithoutSource, isHttpsUrl, sourceLabel } from './sourceLink'

describe('source request presentation', () => {
  const jiraUrl = 'https://digitalrealty-cdo.atlassian.net/browse/PCT-49'

  it('shows a Jira key instead of a raw Jira URL', () => {
    expect(sourceLabel(jiraUrl)).toBe('PCT-49')
  })

  it('uses the hostname for other source systems', () => {
    expect(sourceLabel('https://forms.example.com/request/42')).toBe('forms.example.com')
  })

  it('removes duplicated ticket keys and URLs from descriptive prose', () => {
    expect(
      descriptionWithoutSource(
        `PCT-49. Imported from Jira; pending approval. ${jiraUrl}`,
        jiraUrl,
      ),
    ).toBe('Imported from Jira; pending approval.')
  })

  it('allows only valid HTTPS source links', () => {
    expect(isHttpsUrl('')).toBe(true)
    expect(isHttpsUrl(jiraUrl)).toBe(true)
    expect(isHttpsUrl('http://example.com')).toBe(false)
    expect(isHttpsUrl('not a URL')).toBe(false)
  })
})
