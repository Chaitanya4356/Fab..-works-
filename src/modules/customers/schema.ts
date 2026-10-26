import { z } from 'zod'
import { optionalCode, optionalMobile, optionalText } from '@/lib/form-fields'
import { GSTIN_PATTERN, gstinStateMessage } from '@/lib/gst'
import { INDIA_STATES, stateCodeFor } from '@/lib/india-states'
import type { Database } from '@/lib/supabase/database.types'

const upper = (value: string) => value.toUpperCase()

export const customerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter the company name.').max(120, 'Use at most 120 characters.'),
    contactPerson: optionalText(80),
    phone: optionalMobile(),
    altPhone: optionalMobile(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address.')
      .transform((v) => (v === '' ? null : v)),
    address: optionalText(500),
    city: optionalText(80),
    state: z
      .string()
      .trim()
      .refine((v) => v === '' || INDIA_STATES.some((s) => s.name === v), 'Choose a state from the list.')
      .transform((v) => (v === '' ? null : v)),
    pincode: optionalCode(/^[1-9]\d{5}$/, 'Enter a 6-digit PIN code.'),
    gstin: optionalCode(GSTIN_PATTERN, 'Enter a 15-character GSTIN, like 36ABCDE1234F1Z5.', upper),
    notes: optionalText(2000),
  })
  .superRefine((c, ctx) => {
    const mismatch = gstinStateMessage(c.gstin, stateCodeFor(c.state))
    if (mismatch) ctx.addIssue({ code: 'custom', path: ['gstin'], message: mismatch })
  })

export type CustomerInput = z.output<typeof customerSchema>

export function toCustomerRow(c: CustomerInput): Database['public']['Tables']['customers']['Update'] {
  return {
    name: c.name,
    contact_person: c.contactPerson,
    phone: c.phone,
    alt_phone: c.altPhone,
    email: c.email,
    address: c.address,
    city: c.city,
    state: c.state,
    pincode: c.pincode,
    gstin: c.gstin,
    notes: c.notes,
  }
}
