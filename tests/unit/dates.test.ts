import { expect, it } from 'vitest'
import { todayIST } from '@/lib/dates'

it('uses the India date, which starts at 18:30 UTC', () => {
  expect(todayIST(new Date('2027-03-31T18:29:00Z'))).toBe('2027-03-31')
  expect(todayIST(new Date('2027-03-31T18:30:00Z'))).toBe('2027-04-01')
})
