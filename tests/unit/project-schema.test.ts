import { describe, expect, it } from 'vitest'
import { makeProjectSchema } from '@/modules/projects/schema'

const schema = makeProjectSchema({ today: '2026-10-25' })
const valid = {
  customerId: 'a0000000-0000-0000-0000-000000000001', title: ' Warehouse shed 40x80 ', siteAddress: 'Shamshabad', description: '',
  status: 'planned', startDate: '2026-11-01', dueDate: '2026-12-15', completedDate: '', contractValue: '12,50,000',
  estMaterial: '6,00,000', estLabour: '1,50,000', estPainting: '', estTransport: '40,000', estOther: '', notes: '',
}
const errorFor = (input: object, field: string) =>
  schema.safeParse(input).error?.issues.find((i) => i.path[0] === field)?.message

describe('project schema', () => {
  it('tidies a project and reads amounts', () => {
    expect(schema.parse(valid)).toMatchObject({
      title: 'Warehouse shed 40x80', description: null, contractValue: 1250000,
      estMaterial: 600000, estPainting: 0, estTransport: 40000, completedDate: null,
    })
  })
  it('fills in the completion date when a project is marked completed', () => {
    expect(schema.parse({ ...valid, status: 'completed' }).completedDate).toBe('2026-10-25')
    expect(schema.parse({ ...valid, status: 'completed', completedDate: '2026-10-20' }).completedDate).toBe('2026-10-20')
  })
  it.each([
    ['customerId', '', 'Choose a customer.'],
    ['title', ' ', 'Enter a project title.'],
    ['status', 'finished', 'Choose a status.'],
    ['contractValue', '-5', 'Enter an amount in rupees, like 1,25,000 or 1250.50.'],
  ])('explains a bad %s', (field, value, message) => {
    expect(errorFor({ ...valid, [field]: value }, field)).toBe(message)
  })
  it('refuses a due date before the start date', () => {
    expect(errorFor({ ...valid, dueDate: '2026-10-30' }, 'dueDate')).toBe('The due date can’t be before the start date.')
  })
})
