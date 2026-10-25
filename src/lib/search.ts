/** Characters PostgREST or ilike cannot take even inside a quoted value: dropped. */
const DROPPED = /[%"*\\]/g
/** Characters that are fine inside a quoted value but awkward in names: matched as "any one character". */
const ANY_ONE = /[,()']/g

/**
 * A list search, as ilike contains-patterns: one for text columns, and a digits-only one for phone columns
 * when the search has at least 4 digits. Null means "no search". Values are double-quoted in or() filters.
 */
export function toSearch(q: string | undefined): { text: string; digits: string | null } | null {
  if (!q) return null
  const text = q.replace(DROPPED, ' ').replace(ANY_ONE, '_').replace(/\s+/g, ' ').trim()
  if (!/[\p{L}\p{N}]/u.test(text)) return null
  return { text: `%${text}%`, digits: phoneDigits(q) }
}

/** Mobiles are stored as 10 digits, so a +91 or leading-0 form is cut back the same way saving does. */
function phoneDigits(q: string): string | null {
  let digits = q.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits.length >= 4 ? `%${digits}%` : null
}
