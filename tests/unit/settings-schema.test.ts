import { describe, expect, it } from 'vitest'
import { settingsSchema } from '@/modules/settings/schema'

const valid = {
  workshopName: 'Sri Balaji Fabricators', address: '', city: 'Hyderabad', state: 'Telangana', pincode: '500018',
  phone: '040 2345 6789', email: '', bankName: 'State Bank of India', bankAccountName: 'Sri Balaji Fabricators',
  bankAccountNo: '30123456789', bankIfsc: 'sbin0001234', upiId: 'balajifab@okhdfcbank', gstEnabled: false, gstin: '',
  defaultGstRate: '18', defaultMarginPercent: '15', quotationValidityDays: '15', invoiceDueDays: '15',
  quotationTerms: '', invoiceTerms: '',
}
const errorFor = (input: object, field: string) =>
  settingsSchema.safeParse(input).error?.issues.find((i) => i.path[0] === field)?.message

describe('settingsSchema', () => {
  it('tidies input: blanks become null, codes become upper case, numbers are parsed', () => {
    expect(settingsSchema.parse(valid)).toMatchObject({
      address: null, email: null, gstin: null, bankIfsc: 'SBIN0001234',
      stateCode: '36', defaultGstRate: 18, quotationValidityDays: 15,
    })
  })
  it('needs a GSTIN before GST can be switched on', () => {
    expect(errorFor({ ...valid, gstEnabled: true }, 'gstin')).toBe('Enter your GSTIN to switch GST on.')
  })
  it('accepts a lower-case GSTIN for the same state', () => {
    expect(settingsSchema.parse({ ...valid, gstEnabled: true, gstin: '36abcde1234f1z5' }).gstin).toBe('36ABCDE1234F1Z5')
  })
  it('catches a GSTIN from another state', () => {
    expect(errorFor({ ...valid, gstin: '27ABCDE1234F1Z5' }, 'gstin'))
      .toBe('This GSTIN is for a different state (code 27). Check the state or the GSTIN.')
  })
  it.each([
    ['workshopName', ' ', 'Enter the workshop name.'],
    ['pincode', '50001', 'Enter a 6-digit PIN code.'],
    ['bankIfsc', 'SBIN001234', 'Enter an 11-character IFSC code, like SBIN0001234.'],
    ['bankAccountNo', '12ab', 'Enter the account number (9 to 18 digits).'],
    ['upiId', 'balajifab', 'Enter a UPI ID, like workshop@okhdfcbank.'],
    ['gstin', '36ABCDE1234F1Y5', 'Enter a 15-character GSTIN, like 36ABCDE1234F1Z5.'],
    ['defaultMarginPercent', '150', 'Enter a number from 0 to 100.'],
    ['invoiceDueDays', '400', 'Enter a whole number of days from 0 to 365.'],
  ])('explains a bad %s', (field, value, message) => {
    expect(errorFor({ ...valid, [field]: value }, field)).toBe(message)
  })
})
