// Exact money for on-screen previews (spec 4.9): rupees as bigint paise, quantities as bigint thousandths,
// every rounding half up — the same results SQL's round() stores.

const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/
const QUANTITY = /^\d{1,11}(\.\d{1,3})?$/
const PERCENT = /^\d{1,3}(\.\d{1,2})?$/

function scaled(text: string, pattern: RegExp, places: number): bigint | null {
  if (!pattern.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  return BigInt(whole + fraction.padEnd(places, '0'))
}

/** n ÷ d rounded half up, for n ≥ 0 and d > 0. */
const divideHalfUp = (n: bigint, d: bigint) => (2n * n + d) / (2n * d)

const twoPlaces = (hundredths: bigint) => {
  const sign = hundredths < 0n ? '-' : ''
  const abs = hundredths < 0n ? -hundredths : hundredths
  return `${sign}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`
}

/** An amount typed the Indian way ("1,15,000", "₹ 219.65") in paise, or null when it is not one. */
export function parsePaise(value: string | number): bigint | null {
  return scaled(String(value).replace(/[₹,\s]/g, ''), AMOUNT, 2)
}

/** A quantity (up to 3 decimals) in thousandths, or null when it is not one. */
export function parseMilli(value: string | number): bigint | null {
  return scaled(String(value).replace(/[,\s]/g, ''), QUANTITY, 3)
}

/** qty × rate, rounded to the paisa. */
export function lineAmount(qtyMilli: bigint, ratePaise: bigint): bigint {
  return divideHalfUp(qtyMilli * ratePaise, 1000n)
}

/** An amount with a percentage added on top, e.g. ₹191 + 15% = ₹219.65. */
export function addMargin(paise: bigint, marginPercent: string | number): bigint {
  const basisPoints = scaled(String(marginPercent).trim(), PERCENT, 2) ?? 0n
  return divideHalfUp(paise * (10000n + basisPoints), 10000n)
}

/** part as a percentage of whole, to two decimals ("13.04"); "0.00" when whole is nothing. */
export function percentOf(part: bigint, whole: bigint): string {
  if (whole <= 0n) return '0.00'
  const hundredths = divideHalfUp((part < 0n ? -part : part) * 10000n, whole)
  return twoPlaces(part < 0n ? -hundredths : hundredths)
}

/** Paise as a plain rupee figure for a form field, e.g. "2745.63". */
export function paiseToRupees(paise: bigint): string {
  return twoPlaces(paise)
}
