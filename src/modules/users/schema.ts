import { z } from 'zod'
import { normalizeIndianMobile } from '@/lib/phone'

const password = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Use at most 72 characters.')

export const newUserSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the full name.').max(80, 'Use at most 80 characters.'),
  phone: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === '') return null
      const mobile = normalizeIndianMobile(value)
      if (!mobile) {
        ctx.addIssue({ code: 'custom', message: 'Enter a 10-digit mobile number.' })
        return z.NEVER
      }
      return mobile
    }),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.')),
  password,
})
export type NewUserInput = z.output<typeof newUserSchema>

export const resetPasswordSchema = z.object({
  userId: z.uuid(),
  password,
})

export const setActiveSchema = z.object({
  userId: z.uuid(),
  active: z.boolean(),
})
