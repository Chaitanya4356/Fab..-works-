import { describe, expect, it } from 'vitest'
import { formatDocNumber, makeDocNumberFormatsSchema } from '@/lib/doc-number'

describe('formatDocNumber gives the same numbers as the database', () => {
  it.each([
    [{ prefix: 'INV', separator: '/', yearStyle: 'full', digits: 4 }, '2027-03-31', 1, 'INV/2026-27/0001'],
    [{ prefix: 'SBF', separator: '/', yearStyle: 'full', digits: 3 }, '2026-10-24', 246, 'SBF/2026-27/246'],
    [{ prefix: 'SBF-Q', separator: '-', yearStyle: 'short', digits: 4 }, '2026-10-24', 1, 'SBF-Q-26-27-0001'],
    [{ prefix: 'PO', separator: '/', yearStyle: 'none', digits: 4 }, '2027-04-01', 2, 'PO/0002'],
    [{ prefix: 'SBF', separator: '/', yearStyle: 'full', digits: 3 }, '2026-10-24', 1000, 'SBF/2026-27/1000'],
    [{ prefix: 'SF', separator: '', yearStyle: 'none', digits: 5 }, '2026-10-24', 42, 'SF00042'],
  ] as const)('%o on %s, number %i, is %s', (format, date, n, expected) => {
    expect(formatDocNumber(format, date, n)).toBe(expected)
  })
})

const row = (prefix: string) => ({ prefix, separator: '/', yearStyle: 'full', digits: '4', nextNumber: '1' })
const formats = { project: row('PRJ'), quotation: row('QT'), invoice: row('INV'), dispatch: row('DN'), po: row('PO') }
const gstOff = makeDocNumberFormatsSchema({ gstEnabled: false, today: '2026-10-24' })
const gstOn = makeDocNumberFormatsSchema({ gstEnabled: true, today: '2026-10-24' })
const errorAt = (schema: typeof gstOff, input: object, type: string, field: string) =>
  schema.safeParse(input).error?.issues.find((i) => i.path[0] === type && i.path[1] === field)?.message

describe('document number formats', () => {
  it('tidies prefixes into capitals and parses numbers', () => {
    expect(gstOff.parse({ ...formats, invoice: { ...row('sbf'), digits: '3', nextNumber: '246' } }).invoice)
      .toEqual({ prefix: 'SBF', separator: '/', yearStyle: 'full', digits: 3, nextNumber: 246 })
  })
  it.each([
    ['prefix', 'INV#', 'Use 1 to 10 letters, digits, - or /, starting with a letter or digit.'],
    ['digits', '9', 'Choose from 1 to 8 digits.'],
    ['nextNumber', '0', 'Enter a whole number, 1 or more.'],
  ])('explains a bad %s', (field, value, message) => {
    expect(errorAt(gstOff, { ...formats, invoice: { ...row('INV'), [field]: value } }, 'invoice', field)).toBe(message)
  })
  it('needs a different prefix for each document type', () => {
    expect(errorAt(gstOff, { ...formats, dispatch: row('inv') }, 'dispatch', 'prefix')).toBe('Each document type needs its own prefix.')
  })
  it('keeps GST invoice numbers to 16 characters once GST is on', () => {
    const long = { ...formats, invoice: row('SBFAB-INV') }
    expect(gstOff.safeParse(long).success).toBe(true)
    expect(errorAt(gstOn, long, 'invoice', 'prefix')).toBe('GST invoice numbers can have at most 16 characters. This format makes 22.')
    expect(gstOn.safeParse(formats).success).toBe(true)
  })
})
