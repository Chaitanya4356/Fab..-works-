import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { optionalDate, optionalMobile, optionalRupees, rupeesOrZero } from '@/lib/form-fields'

const RUPEES = 'Enter an amount in rupees, like 1,25,000 or 1250.50.'
const errorOf = (schema: z.ZodType, value: unknown) => schema.safeParse(value).error?.issues[0]?.message

describe('rupee fields', () => {
  it('read amounts typed the Indian way', () => {
    expect(optionalRupees().parse('12,50,000')).toBe(1250000)
    expect(optionalRupees().parse('₹ 5,00,000.50')).toBe(500000.5)
    expect(optionalRupees().parse('1250')).toBe(1250)
  })
  it('treat a blank as no amount, or as zero for estimates', () => {
    expect(optionalRupees().parse('')).toBeNull()
    expect(rupeesOrZero().parse('  ')).toBe(0)
  })
  it.each(['1.234', '-500', '12abc', '1e5', '1,00,00,00,00,00,000'])('refuse %s with a clear message', (value) => {
    expect(errorOf(optionalRupees(), value)).toBe(RUPEES)
  })
})

describe('mobile and date fields', () => {
  it('tidy a mobile number or explain it', () => {
    expect(optionalMobile().parse('+91 98765-43210')).toBe('9876543210')
    expect(optionalMobile().parse('')).toBeNull()
    expect(errorOf(optionalMobile(), '12345')).toBe('Enter a 10-digit mobile number.')
  })
  it('accept a calendar date or a blank', () => {
    expect(optionalDate().parse('2026-11-30')).toBe('2026-11-30')
    expect(optionalDate().parse('')).toBeNull()
    expect(errorOf(optionalDate(), '30-11-2026')).toBe('Enter a date.')
  })
})
