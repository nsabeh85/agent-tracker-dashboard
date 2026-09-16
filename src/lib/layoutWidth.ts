/**
 * The dashboard is a landscape board, so it uses the full width of a wide
 * monitor. Single-record pages stay a narrow vertical column so long text and
 * stacked stage cards remain readable.
 */
const WIDE = 'max-w-[1600px]'
const COLUMN = 'max-w-4xl'

export function normalizePath(pathname: string): string {
  const trimmed = pathname.trim().replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

export function isWideRoute(pathname: string): boolean {
  return normalizePath(pathname) === '/'
}

export function containerWidthClass(pathname: string): string {
  return isWideRoute(pathname) ? WIDE : COLUMN
}
