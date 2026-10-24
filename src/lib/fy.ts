const CALENDAR_DATE = /^(\d{4})-(\d{2})-\d{2}$/

/** The Indian financial year (1 April to 31 March) a date belongs to, e.g. "2026-27". */
export function financialYear(isoDate: string): string {
  const match = CALENDAR_DATE.exec(isoDate)
  if (!match) throw new Error('Expected a date as YYYY-MM-DD')
  const year = Number(match[1])
  const start = Number(match[2]) >= 4 ? year : year - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}
