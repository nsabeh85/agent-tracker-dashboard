import { describe, expect, it } from 'vitest'
import {
  canManageComment,
  replyIndentClass,
  threadComments,
} from './comments'

type Row = {
  id: string
  created_at: string
  parent_comment_id?: string | null
}

const newestFirst: Row[] = [
  { id: 'reply-b', created_at: '2026-09-15T12:00:00Z', parent_comment_id: 'root-old' },
  { id: 'reply-a', created_at: '2026-09-14T12:00:00Z', parent_comment_id: 'root-old' },
  { id: 'root-new', created_at: '2026-09-13T12:00:00Z', parent_comment_id: null },
  { id: 'root-old', created_at: '2026-09-01T12:00:00Z', parent_comment_id: null },
]

describe('threadComments', () => {
  it('places each reply under its parent, oldest reply first', () => {
    expect(threadComments(newestFirst).map((row) => [row.comment.id, row.depth])).toEqual([
      ['root-new', 0],
      ['root-old', 0],
      ['reply-a', 1],
      ['reply-b', 1],
    ])
  })

  it('nests a reply to a reply one level deeper', () => {
    const rows: Row[] = [
      { id: 'root', created_at: '2026-09-01T12:00:00Z' },
      { id: 'reply', created_at: '2026-09-02T12:00:00Z', parent_comment_id: 'root' },
      { id: 'nested', created_at: '2026-09-03T12:00:00Z', parent_comment_id: 'reply' },
    ]
    expect(threadComments(rows).map((row) => [row.comment.id, row.depth])).toEqual([
      ['root', 0],
      ['reply', 1],
      ['nested', 2],
    ])
  })

  it('keeps older comments that predate replies at the top level', () => {
    const rows: Row[] = [
      { id: 'legacy-b', created_at: '2026-08-02T12:00:00Z' },
      { id: 'legacy-a', created_at: '2026-08-01T12:00:00Z' },
    ]
    expect(threadComments(rows).map((row) => [row.comment.id, row.depth])).toEqual([
      ['legacy-b', 0],
      ['legacy-a', 0],
    ])
  })

  it('shows a reply whose parent was deleted as a top-level comment', () => {
    const rows: Row[] = [
      { id: 'orphan', created_at: '2026-09-05T12:00:00Z', parent_comment_id: 'gone' },
    ]
    expect(threadComments(rows).map((row) => [row.comment.id, row.depth])).toEqual([
      ['orphan', 0],
    ])
  })

  it('never drops a comment that points at itself or forms a cycle', () => {
    const rows: Row[] = [
      { id: 'self', created_at: '2026-09-05T12:00:00Z', parent_comment_id: 'self' },
      { id: 'a', created_at: '2026-09-06T12:00:00Z', parent_comment_id: 'b' },
      { id: 'b', created_at: '2026-09-07T12:00:00Z', parent_comment_id: 'a' },
    ]
    expect(threadComments(rows).map((row) => row.comment.id).sort()).toEqual(['a', 'b', 'self'])
  })
})

describe('canManageComment', () => {
  it('matches the author regardless of case or padding', () => {
    expect(canManageComment('Person@digitalrealty.com', 'person@digitalrealty.com')).toBe(true)
    expect(canManageComment(' person@digitalrealty.com ', 'person@digitalrealty.com')).toBe(true)
  })

  it('refuses a different author, a signed-out viewer, or a blank author', () => {
    expect(canManageComment('other@digitalrealty.com', 'person@digitalrealty.com')).toBe(false)
    expect(canManageComment('person@digitalrealty.com', null)).toBe(false)
    expect(canManageComment('', '')).toBe(false)
  })
})

describe('replyIndentClass', () => {
  it('indents replies and caps the depth', () => {
    expect(replyIndentClass(0)).toBe('')
    expect(replyIndentClass(1)).not.toBe('')
    expect(replyIndentClass(9)).toBe(replyIndentClass(2))
  })
})
