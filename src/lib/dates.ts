const istCalendarDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(now: Date = new Date()): string {
  return istCalendarDate.format(now)
}
