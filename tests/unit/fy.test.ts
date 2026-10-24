import { expect, it } from 'vitest'
import { financialYear } from '@/lib/fy'

it('starts the financial year on 1 April', () => {
  expect(financialYear('2026-04-01')).toBe('2026-27')
  expect(financialYear('2027-03-31')).toBe('2026-27')
  expect(financialYear('2027-04-01')).toBe('2027-28')
  expect(financialYear('2099-04-01')).toBe('2099-00')
})
it('only accepts YYYY-MM-DD', () => {
  expect(() => financialYear('31-03-2027')).toThrow('Expected a date as YYYY-MM-DD')
})
