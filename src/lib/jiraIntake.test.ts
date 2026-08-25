import { describe, expect, it } from 'vitest'
import { JIRA_INTAKE } from './jiraIntake'

describe('JIRA_INTAKE', () => {
  it('lists forty PCT requests', () => {
    expect(JIRA_INTAKE).toHaveLength(40)
    expect(new Set(JIRA_INTAKE.map((row) => row.key)).size).toBe(40)
  })
})
