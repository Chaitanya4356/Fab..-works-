/** Characters that are wildcards in ilike or break PostgREST's or() filter syntax. */
const UNSAFE = /[%_,()"'*\\]/g

/**
 * A list search, as ilike contains-patterns: one for text columns, and a digits-only one for phone columns
 * when the search has at least 4 digits. Null means "no search".
 */
export function toSearch(q: string | undefined): { text: string; digits: string | null } | null {
  if (!q) return null
  const text = q.replace(UNSAFE, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return null
  const digits = q.replace(/\D/g, '')
  return { text: `%${text}%`, digits: digits.length >= 4 ? `%${digits}%` : null }
}
