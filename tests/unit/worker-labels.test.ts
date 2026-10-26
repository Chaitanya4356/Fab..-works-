import { expect, it } from 'vitest'
import { wageText } from '@/modules/workers/labels'

it('shows a wage with its period', () => {
  expect(wageText('daily', 650)).toBe('₹650.00 per day')
  expect(wageText('hourly', '90')).toBe('₹90.00 per hour')
  expect(wageText('monthly', 18000)).toBe('₹18,000.00 per month')
  expect(wageText(null, null)).toBeNull()
})
