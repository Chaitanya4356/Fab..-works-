import { z } from 'zod'
import { numberIn, optionalCode, optionalText } from '@/lib/form-fields'
import { GSTIN_PATTERN, gstinStateMessage } from '@/lib/gst'
import { INDIA_STATES, stateCodeFor } from '@/lib/india-states'
import type { Database } from '@/lib/supabase/database.types'

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
    gstin: optionalCode(GSTIN_PATTERN, 'Enter a 15-character GSTIN, like 36ABCDE1234F1Z5.', upper),
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
    const mismatch = gstinStateMessage(s.gstin, stateCodeFor(s.state))
    if (mismatch) ctx.addIssue({ code: 'custom', path: ['gstin'], message: mismatch })
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
