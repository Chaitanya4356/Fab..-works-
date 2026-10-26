import { describe, expect, it } from 'vitest'
import { addMargin, lineAmount, paiseToRupees, parseMilli, parsePaise, percentOf } from '@/lib/money'

describe('money in paise', () => {
  it('reads rupees and quantities exactly', () => {
    expect(parsePaise('1,15,000')).toBe(11500000n)
    expect(parsePaise('₹ 219.65')).toBe(21965n)
    expect(parsePaise(650)).toBe(65000n)
    expect(parsePaise('1.234')).toBeNull()
    expect(parsePaise('abc')).toBeNull()
    expect(parseMilli('12.5')).toBe(12500n)
    expect(parseMilli('0.125')).toBe(125n)
    expect(parseMilli('1.2345')).toBeNull()
  })
  it('rounds half up to the paisa', () => {
    expect(lineAmount(12500n, 21965n)).toBe(274563n)
    expect(addMargin(19100n, '15')).toBe(21965n)
    expect(addMargin(10000000n, '15')).toBe(11500000n)
    expect(addMargin(33333n, '12.5')).toBe(37500n)
  })
  it('shows paise as rupees and a share as a percentage', () => {
    expect(paiseToRupees(274563n)).toBe('2745.63')
    expect(paiseToRupees(-37n)).toBe('-0.37')
    expect(percentOf(1500000n, 11500000n)).toBe('13.04')
    expect(percentOf(0n, 0n)).toBe('0.00')
  })
})
