import { describe, expect, it } from 'vitest'
import { newUserSchema } from '@/modules/users/schema'

const good = { fullName: '  Ravi Kumar ', phone: '98765 43210', email: ' Ravi@Example.com ', password: 'workshop-26' }

describe('newUserSchema', () => {
  it('tidies a complete user', () => {
    expect(newUserSchema.parse(good)).toEqual({ fullName: 'Ravi Kumar', phone: '9876543210', email: 'ravi@example.com', password: 'workshop-26' })
  })
  it('allows a blank phone', () => {
    expect(newUserSchema.parse({ ...good, phone: '' }).phone).toBeNull()
  })
  it.each([
    ['fullName', 'R', 'Enter the full name.'],
    ['phone', '12345', 'Enter a 10-digit mobile number.'],
    ['email', 'not-an-email', 'Enter a valid email address.'],
    ['password', 'short', 'Use at least 8 characters.'],
  ])('explains a bad %s', (field, value, message) => {
    const result = newUserSchema.safeParse({ ...good, [field]: value })
    expect(result.success).toBe(false)
    expect(result.error!.issues.find((i) => i.path[0] === field)!.message).toBe(message)
  })
})
