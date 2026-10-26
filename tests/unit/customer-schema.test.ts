import { describe, expect, it } from 'vitest'
import { customerSchema } from '@/modules/customers/schema'

const valid = {
  name: '  Sharma Steel Traders ', contactPerson: 'Ravi Sharma', phone: '98765 43210', altPhone: '', email: ' Accounts@Sharma.IN ',
  address: '', city: 'Hyderabad', state: 'Telangana', pincode: '500018', gstin: '36abcde1234f1z5', notes: '',
}
const errorFor = (input: object, field: string) =>
  customerSchema.safeParse(input).error?.issues.find((i) => i.path[0] === field)?.message

describe('customerSchema', () => {
  it('tidies a customer', () => {
    expect(customerSchema.parse(valid)).toMatchObject({
      name: 'Sharma Steel Traders', phone: '9876543210', altPhone: null, email: 'accounts@sharma.in',
      address: null, gstin: '36ABCDE1234F1Z5', notes: null,
    })
  })
  it('needs only a name', () => {
    const blank = Object.fromEntries(Object.keys(valid).map((k) => [k, '']))
    expect(customerSchema.safeParse({ ...blank, name: 'Lakshmi Agro' }).success).toBe(true)
  })
  it.each([
    ['name', ' ', 'Enter the company name.'],
    ['phone', '12345', 'Enter a 10-digit mobile number.'],
    ['email', 'not-an-email', 'Enter a valid email address.'],
    ['pincode', '5000', 'Enter a 6-digit PIN code.'],
    ['gstin', '36ABCDE1234F1Y5', 'Enter a 15-character GSTIN, like 36ABCDE1234F1Z5.'],
  ])('explains a bad %s', (field, value, message) => {
    expect(errorFor({ ...valid, [field]: value }, field)).toBe(message)
  })
  it('catches a GSTIN from another state', () => {
    expect(errorFor({ ...valid, gstin: '27ABCDE1234F1Z5' }, 'gstin'))
      .toBe('This GSTIN is for a different state (code 27). Check the state or the GSTIN.')
  })
})
