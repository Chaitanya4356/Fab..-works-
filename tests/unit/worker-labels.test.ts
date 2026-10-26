import { expect, it } from 'vitest'
import { teamDates, wageText, workerOptionLabel } from '@/modules/workers/labels'

it('shows a wage with its period', () => {
  expect(wageText('daily', 650)).toBe('₹650.00 per day')
  expect(wageText('hourly', '90')).toBe('₹90.00 per hour')
  expect(wageText('monthly', 18000)).toBe('₹18,000.00 per month')
  expect(wageText(null, null)).toBeNull()
})

it('names a worker in the team picker with their other current projects', () => {
  expect(workerOptionLabel({ id: 'x', name: 'Ramesh Kumar', trade: 'welder', otherProjects: [] })).toBe('Ramesh Kumar · Welder')
  expect(workerOptionLabel({ id: 'x', name: 'Ramesh Kumar', trade: 'welder', otherProjects: ['PRJ/2026-27/0003', 'PRJ/2026-27/0007'] }))
    .toBe('Ramesh Kumar · Welder · also on PRJ/2026-27/0003, PRJ/2026-27/0007')
  expect(workerOptionLabel({ id: 'x', name: 'Imran', trade: null, otherProjects: [] })).toBe('Imran')
})

it('describes when a worker was on a team', () => {
  expect(teamDates('2026-11-01', null)).toBe('Since 01-11-2026')
  expect(teamDates(null, null)).toBe('Current')
  expect(teamDates('2026-11-01', '2026-11-05')).toBe('01-11-2026 to 05-11-2026')
  expect(teamDates(null, '2026-11-05')).toBe('Until 05-11-2026')
})
