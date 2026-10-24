const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

const istDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** ₹ with Indian digit grouping and paise, e.g. ₹1,00,000.00 */
export function formatINR(amount: number | string): string {
  return inr.format(Number(amount))
}

/** DD-MM-YYYY. Calendar dates pass through unchanged; instants use the India date. */
export function formatDate(value: Date | string): string {
  if (typeof value === 'string') {
    const match = CALENDAR_DATE.exec(value)
    if (match) return `${match[3]}-${match[2]}-${match[1]}`
  }
  const parts = istDate.formatToParts(new Date(value))
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  return `${get('day')}-${get('month')}-${get('year')}`
}

const UNITS = ['KB', 'MB', 'GB']

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(1)} ${UNITS[unit]}`
}
