import { z } from 'zod'
import { normalizeIndianMobile } from './phone'

/** Optional text: trimmed, blank becomes null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .transform((value) => (value === '' ? null : value))

/** Optional code with a fixed shape: tidied, blank becomes null, anything else must match. */
export const optionalCode = (pattern: RegExp, message: string, tidy: (value: string) => string = (v) => v) =>
  z.string().transform((raw, ctx) => {
    const value = tidy(raw.trim())
    if (value === '') return null
    if (!pattern.test(value)) {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }
    return value
  })

export const numberIn = (min: number, max: number, message: string, wholeOnly = false) =>
  z.union([z.number(), z.string()]).transform((value, ctx) => {
    const text = String(value).trim()
    const n = Number(text)
    if (text === '' || !Number.isFinite(n) || n < min || n > max || (wholeOnly && !Number.isInteger(n))) {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }
    return n
  })

const RUPEES_MESSAGE = 'Enter an amount in rupees, like 1,25,000 or 1250.50.'
// numeric(14,2): up to 12 digits before the point and 2 after.
const RUPEES = /^\d{1,12}(\.\d{1,2})?$/

/** An amount typed the Indian way ("12,50,000", "₹ 5,00,000.50"); blank becomes `blank`. */
const rupees = <T extends number | null>(blank: T) =>
  z.union([z.number(), z.string()]).transform((value, ctx): number | T => {
    const text = String(value).replace(/[₹,\s]/g, '')
    if (text === '') return blank
    if (!RUPEES.test(text)) {
      ctx.addIssue({ code: 'custom', message: RUPEES_MESSAGE })
      return z.NEVER
    }
    return Number(text)
  })

export const optionalRupees = () => rupees(null)
export const rupeesOrZero = () => rupees(0)

export const optionalMobile = () =>
  z.string().transform((raw, ctx) => {
    const value = raw.trim()
    if (value === '') return null
    const mobile = normalizeIndianMobile(value)
    if (!mobile) {
      ctx.addIssue({ code: 'custom', message: 'Enter a 10-digit mobile number.' })
      return z.NEVER
    }
    return mobile
  })

export const optionalDate = () => optionalCode(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date.')
