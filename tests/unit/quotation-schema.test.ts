import { describe, expect, it } from 'vitest'
import { quotationSchema } from '@/modules/quotations/schema'

const valid = {
  customerId: 'a0000000-0000-0000-0000-000000000001', title: ' Warehouse shed ', siteAddress: '', scope: 'Shed 40x80',
  terms: '', enquiryDate: '', quoteDate: '2026-11-02', validUntil: '2026-11-17', followUpDate: '', marginPercent: '15',
  costLines: [{ category: 'material', description: 'Steel', qty: '1', unit: 'lot', costRate: '60,000' }],
  items: [{ description: 'Shed', hsnSac: '', qty: '1', unit: 'job', rate: '₹ 69,000' }],
}
const errorFor = (input: object, path: string) =>
  quotationSchema.safeParse(input).error?.issues.find((i) => i.path.join('.') === path)?.message

describe('quotationSchema', () => {
  it('tidies a quotation', () => {
    expect(quotationSchema.parse(valid)).toMatchObject({
      title: 'Warehouse shed', siteAddress: null, enquiryDate: null, marginPercent: 15,
      costLines: [{ category: 'material', qty: 1, unit: 'lot', costRate: 60000 }],
      items: [{ description: 'Shed', hsnSac: null, qty: 1, rate: 69000 }],
    })
  })
  it.each([
    ['title', { title: ' ' }, 'Enter what the quotation is for.'],
    ['quoteDate', { quoteDate: '' }, 'Enter the quotation date.'],
    ['marginPercent', { marginPercent: '15.555' }, 'Enter a margin like 15 or 12.5.'],
    ['validUntil', { validUntil: '2026-11-01' }, 'Valid until cannot be before the quotation date.'],
    ['items.0.qty', { items: [{ ...valid.items[0], qty: 'two' }] }, 'Enter a quantity, like 12 or 12.5.'],
    ['items.0.qty', { items: [{ ...valid.items[0], qty: '0' }] }, 'Enter a quantity, like 12 or 12.5.'],
    ['items.0.rate', { items: [{ ...valid.items[0], rate: '' }] }, 'Enter an amount in rupees, like 1,25,000 or 1250.50.'],
    ['items.0.hsnSac', { items: [{ ...valid.items[0], hsnSac: '73' }] }, 'Enter a 4 to 8 digit HSN or SAC code.'],
    ['costLines.0.description', { costLines: [{ ...valid.costLines[0], description: '' }] }, 'Describe this cost.'],
  ])('explains a bad %s', (path, change, message) => {
    expect(errorFor({ ...valid, ...change }, path)).toBe(message)
  })
})
