import { describe, expect, it } from 'vitest'
import { JIRA_INTAKE, ownerName } from './jiraIntake'

describe('JIRA_INTAKE', () => {
  it('lists forty PCT requests', () => {
    expect(JIRA_INTAKE).toHaveLength(40)
    expect(new Set(JIRA_INTAKE.map((row) => row.key)).size).toBe(40)
  })

  it('normalizes short admin owner names to full names', () => {
    expect(ownerName('Lauren')).toBe('Lauren Lawhon')
    expect(ownerName('Nabih')).toBe('Nabih Sabeh')
    expect(ownerName('Mark')).toBe('Mark Seay')
    expect(ownerName('Nabih Sabeh')).toBe('Nabih Sabeh')
  })
})
