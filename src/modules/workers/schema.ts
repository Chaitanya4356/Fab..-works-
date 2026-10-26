import { z } from 'zod'
import { optionalCode, optionalDate, optionalMobile, optionalRupees, optionalText } from '@/lib/form-fields'
import type { Database } from '@/lib/supabase/database.types'
import { PAY_TYPES, TRADES, type PayType, type Trade } from './labels'

const MAX_PAY_RATE = 1_000_000

/** A choice from a fixed list; a blank choice means none. */
const optionalChoice = <T extends string>(choices: readonly T[], message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (choices as readonly string[]).includes(v), message)
    .transform((v) => (v === '' ? null : (v as T)))

export const workerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter the worker’s name.').max(120, 'Use at most 120 characters.'),
    trade: optionalChoice<Trade>(TRADES, 'Choose a trade from the list.'),
    phone: optionalMobile(),
    altPhone: optionalMobile(),
    address: optionalText(500),
    joiningDate: optionalDate(),
    skills: optionalText(500),
    // numeric(4,1): whole years or one decimal, so nothing is silently rounded.
    experienceYears: optionalCode(/^\d{1,2}(\.\d)?$/, 'Enter years of experience, like 5 or 5.5.').transform((v) =>
      v === null ? null : Number(v),
    ),
    payType: optionalChoice<PayType>(PAY_TYPES, 'Choose daily, hourly or monthly.'),
    payRate: optionalRupees().refine((v) => v === null || v <= MAX_PAY_RATE, 'Enter a pay rate up to ₹10,00,000.'),
    emergencyContactName: optionalText(80),
    emergencyContactPhone: optionalMobile(),
    notes: optionalText(2000),
  })
  .superRefine((w, ctx) => {
    if (w.payRate !== null && w.payType === null) {
      ctx.addIssue({ code: 'custom', path: ['payType'], message: 'Choose daily, hourly or monthly.' })
    }
    if (w.payType !== null && w.payRate === null) {
      ctx.addIssue({ code: 'custom', path: ['payRate'], message: 'Enter the pay rate.' })
    }
  })

export type WorkerInput = z.output<typeof workerSchema>

export function toWorkerRow(w: WorkerInput): Database['public']['Tables']['workers']['Update'] {
  return {
    full_name: w.fullName,
    trade: w.trade,
    phone: w.phone,
    alt_phone: w.altPhone,
    address: w.address,
    joining_date: w.joiningDate,
    skills: w.skills,
    experience_years: w.experienceYears,
    pay_type: w.payType,
    pay_rate: w.payRate,
    emergency_contact_name: w.emergencyContactName,
    emergency_contact_phone: w.emergencyContactPhone,
    notes: w.notes,
  }
}

export const teamPlaceSchema = z.object({
  workerId: z.guid('Choose a worker.'),
  role: optionalText(80),
  fromDate: optionalDate(),
})

export const lastDaySchema = z.object({
  lastDay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the last day.'),
})
