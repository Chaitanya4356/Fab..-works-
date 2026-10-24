import { expect, it } from 'vitest'
import { normalizeIndianMobile } from '@/lib/phone'

it('keeps 10 digits from common ways of typing a mobile number', () => {
  expect(normalizeIndianMobile('98765 43210')).toBe('9876543210')
  expect(normalizeIndianMobile('+91 98765-43210')).toBe('9876543210')
  expect(normalizeIndianMobile('098765 43210')).toBe('9876543210')
})
it('rejects numbers that are not Indian mobiles', () => {
  expect(normalizeIndianMobile('12345')).toBeNull()
  expect(normalizeIndianMobile('5876543210')).toBeNull()
})
