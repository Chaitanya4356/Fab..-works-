import { z } from 'zod'
import { INDIA_STATES, stateCodeFor } from '@/lib/india-states'
import type { Database } from '@/lib/supabase/database.types'

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

/** Optional text: trimmed, blank becomes null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .transform((value) => (value === '' ? null : value))

/** Optional code with a fixed shape: tidied, blank becomes null, anything else must match. */
const optionalCode = (pattern: RegExp, message: string, tidy: (value: string) => string = (v) => v) =>
  z.string().transform((raw, ctx) => {
    const value = tidy(raw.trim())
    if (value === '') return null
    if (!pattern.test(value)) {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }
    return value
  })

const numberIn = (min: number, max: number, message: string, wholeOnly = false) =>
  z.union([z.number(), z.string()]).transform((value, ctx) => {
    const text = String(value).trim()
    const n = Number(text)
    if (text === '' || !Number.isFinite(n) || n < min || n > max || (wholeOnly && !Number.isInteger(n))) {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }
    return n
  })

const upper = (value: string) => value.toUpperCase()

export const settingsSchema = z
  .object({
    workshopName: z.string().trim().min(2, 'Enter the workshop name.').max(120, 'Use at most 120 characters.'),
    address: optionalText(500),
    city: optionalText(80),
    state: z
      .string()
      .trim()
      .refine((v) => v === '' || INDIA_STATES.some((s) => s.name === v), 'Choose a state from the list.')
      .transform((v) => (v === '' ? null : v)),
    pincode: optionalCode(/^[1-9]\d{5}$/, 'Enter a 6-digit PIN code.'),
    phone: optionalText(40),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address.')
      .transform((v) => (v === '' ? null : v)),
    bankName: optionalText(120),
    bankAccountName: optionalText(120),
    bankAccountNo: optionalCode(/^\d{9,18}$/, 'Enter the account number (9 to 18 digits).', (v) => v.replace(/\s/g, '')),
    bankIfsc: optionalCode(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter an 11-character IFSC code, like SBIN0001234.', upper),
    upiId: optionalCode(/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/, 'Enter a UPI ID, like workshop@okhdfcbank.'),
    gstEnabled: z.boolean(),
    gstin: optionalCode(GSTIN, 'Enter a 15-character GSTIN, like 36ABCDE1234F1Z5.', upper),
    defaultGstRate: numberIn(0, 100, 'Enter a number from 0 to 100.'),
    defaultMarginPercent: numberIn(0, 100, 'Enter a number from 0 to 100.'),
    quotationValidityDays: numberIn(1, 365, 'Enter a whole number of days from 1 to 365.', true),
    invoiceDueDays: numberIn(0, 365, 'Enter a whole number of days from 0 to 365.', true),
    quotationTerms: optionalText(2000),
    invoiceTerms: optionalText(2000),
  })
  .superRefine((s, ctx) => {
    if (s.gstEnabled && !s.gstin) {
      ctx.addIssue({ code: 'custom', path: ['gstin'], message: 'Enter your GSTIN to switch GST on.' })
    }
    if (s.gstEnabled && !s.state) {
      // Invoices need the workshop's state to decide between CGST + SGST and IGST.
      ctx.addIssue({ code: 'custom', path: ['state'], message: "Choose the workshop's state to switch GST on." })
    }
    const stateCode = stateCodeFor(s.state)
    if (s.gstin && stateCode && s.gstin.slice(0, 2) !== stateCode) {
      ctx.addIssue({
        code: 'custom',
        path: ['gstin'],
        message: `This GSTIN is for a different state (code ${s.gstin.slice(0, 2)}). Check the state or the GSTIN.`,
      })
    }
  })
  .transform((s) => ({ ...s, stateCode: stateCodeFor(s.state) }))

export type SettingsInput = z.output<typeof settingsSchema>

export function toSettingsRow(s: SettingsInput): Database['public']['Tables']['settings']['Update'] {
  return {
    workshop_name: s.workshopName,
    address: s.address,
    city: s.city,
    state: s.state,
    state_code: s.stateCode,
    pincode: s.pincode,
    phone: s.phone,
    email: s.email,
    bank_name: s.bankName,
    bank_account_name: s.bankAccountName,
    bank_account_no: s.bankAccountNo,
    bank_ifsc: s.bankIfsc,
    upi_id: s.upiId,
    gst_enabled: s.gstEnabled,
    gstin: s.gstin,
    default_gst_rate: s.defaultGstRate,
    default_margin_percent: s.defaultMarginPercent,
    quotation_validity_days: s.quotationValidityDays,
    invoice_due_days: s.invoiceDueDays,
    quotation_terms: s.quotationTerms,
    invoice_terms: s.invoiceTerms,
  }
}
