import { describe, expect, it } from 'vitest'
import { lastDayProblem, workerSchema } from '@/modules/workers/schema'

const valid = {
  fullName: '  Ramesh Kumar ', trade: 'welder', phone: '+91 98765 00001', altPhone: '', address: '', joiningDate: '2026-04-01',
  skills: 'TIG, MIG', experienceYears: '5.5', payType: 'daily', payRate: '1,500', emergencyContactName: 'Sita Kumar',
  emergencyContactPhone: '98765 00002', notes: '',
}
const errorFor = (input: object, field: string) =>
  workerSchema.safeParse(input).error?.issues.find((i) => i.path[0] === field)?.message

describe('workerSchema', () => {
  it('tidies a worker', () => {
    expect(workerSchema.parse(valid)).toMatchObject({
      fullName: 'Ramesh Kumar', trade: 'welder', phone: '9876500001', altPhone: null, joiningDate: '2026-04-01',
      experienceYears: 5.5, payType: 'daily', payRate: 1500, emergencyContactPhone: '9876500002', notes: null,
    })
  })
  it('needs only a name', () => {
    const blank = Object.fromEntries(Object.keys(valid).map((k) => [k, '']))
    expect(workerSchema.parse({ ...blank, fullName: 'Imran' })).toMatchObject({ trade: null, payType: null, payRate: null, experienceYears: null })
  })
  it.each([
    ['fullName', ' ', 'Enter the worker’s name.'],
    ['trade', 'plumber', 'Choose a trade from the list.'],
    ['phone', '12345', 'Enter a 10-digit mobile number.'],
    ['joiningDate', '01-04-2026', 'Enter a date.'],
    ['experienceYears', '5.55', 'Enter years of experience, like 5 or 5.5.'],
    ['experienceYears', 'five', 'Enter years of experience, like 5 or 5.5.'],
    ['payRate', '25,00,00,000', 'Enter a pay rate up to ₹10,00,000.'],
    ['payRate', '-650', 'Enter an amount in rupees, like 1,25,000 or 1250.50.'],
  ])('explains a bad %s', (field, value, message) => {
    expect(errorFor({ ...valid, [field]: value }, field)).toBe(message)
  })
  it('keeps a pay rate and its pay type together', () => {
    expect(errorFor({ ...valid, payType: '' }, 'payType')).toBe('Choose daily, hourly or monthly.')
    expect(errorFor({ ...valid, payRate: '' }, 'payRate')).toBe('Enter the pay rate.')
  })
})

describe('lastDayProblem', () => {
  const today = '2026-11-10'
  it('accepts a last day from the day they joined up to today', () => {
    expect(lastDayProblem('2026-11-10', '2026-11-01', today)).toBeNull()
    expect(lastDayProblem('2026-11-01', '2026-11-01', today)).toBeNull()
    expect(lastDayProblem('2026-11-05', null, today)).toBeNull()
  })
  it('refuses a last day before they joined', () => {
    expect(lastDayProblem('2026-10-31', '2026-11-01', today)).toBe('The last day cannot be before 01-11-2026, when they joined the team.')
  })
  it('refuses a last day after today while they are on the team', () => {
    expect(lastDayProblem('2026-11-14', '2026-11-01', today)).toBe('The last day cannot be after today.')
    expect(lastDayProblem('2026-11-14', null, today)).toBe('The last day cannot be after today.')
  })
  it('lets someone who has not joined yet be taken off on their joining day', () => {
    expect(lastDayProblem('2026-11-20', '2026-11-20', today)).toBeNull()
    expect(lastDayProblem('2026-11-21', '2026-11-20', today)).toBe('The last day cannot be after today.')
  })
})
