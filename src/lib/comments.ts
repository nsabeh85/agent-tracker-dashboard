type ThreadableComment = {
  id: string
  created_at: string
  parent_comment_id?: string | null
}

export type ThreadedComment<T> = {
  comment: T
  depth: number
}

export function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

/**
 * Only the author may edit or delete, matching the row-level policy. Comments
 * posted under another address stay read-only even for administrators.
 */
export function canManageComment(
  authorEmail: string | null | undefined,
  viewerEmail: string | null | undefined,
): boolean {
  const author = normalizeEmail(authorEmail)
  const viewer = normalizeEmail(viewerEmail)
  return author.length > 0 && author === viewer
}

/**
 * Flattens comments so each reply follows its parent. Top-level comments keep
 * the incoming order, replies read oldest first, and a reply whose parent is
 * missing is shown as a top-level comment so it cannot disappear.
 */
export function threadComments<T extends ThreadableComment>(
  comments: T[],
): Array<ThreadedComment<T>> {
  const byId = new Map(comments.map((comment) => [comment.id, comment]))
  const replies = new Map<string, T[]>()
  const roots: T[] = []

  for (const comment of comments) {
    const parentId = comment.parent_comment_id
    if (parentId && parentId !== comment.id && byId.has(parentId)) {
      const siblings = replies.get(parentId) ?? []
      siblings.push(comment)
      replies.set(parentId, siblings)
    } else {
      roots.push(comment)
    }
  }

  for (const siblings of replies.values()) {
    siblings.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  const ordered: Array<ThreadedComment<T>> = []
  const visited = new Set<string>()

  function walk(comment: T, depth: number) {
    if (visited.has(comment.id)) return
    visited.add(comment.id)
    ordered.push({ comment, depth })
    for (const reply of replies.get(comment.id) ?? []) {
      walk(reply, depth + 1)
    }
  }

  for (const root of roots) {
    walk(root, 0)
  }

  // A parent cycle would otherwise drop rows from the list.
  for (const comment of comments) {
    if (!visited.has(comment.id)) walk(comment, 0)
  }

  return ordered
}

const REPLY_INDENT = ['', 'ml-6 md:ml-10', 'ml-10 md:ml-16'] as const

export function replyIndentClass(depth: number): string {
  return REPLY_INDENT[Math.min(Math.max(depth, 0), REPLY_INDENT.length - 1)]
}
