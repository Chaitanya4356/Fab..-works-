import { describe, expect, it } from 'vitest'
import { formatBytes, formatDate, formatINR } from '@/lib/format'

describe('formatINR', () => {
  it('uses Indian digit grouping with paise', () => {
    expect(formatINR(100000)).toBe('₹1,00,000.00')
    expect(formatINR(5443.5)).toBe('₹5,443.50')
    expect(formatINR(23550075.5)).toBe('₹2,35,50,075.50')
    expect(formatINR('57300')).toBe('₹57,300.00')
    expect(formatINR(0)).toBe('₹0.00')
  })
  it('shows negative amounts with a minus sign', () => {
    expect(formatINR(-286.5)).toBe('-₹286.50')
  })
})

describe('formatDate', () => {
  it('formats calendar dates without shifting them', () => {
    expect(formatDate('2026-10-24')).toBe('24-10-2026')
  })
  it('turns instants into the India date', () => {
    expect(formatDate('2027-03-31T18:30:00Z')).toBe('01-04-2027')
    expect(formatDate(new Date('2027-03-31T18:29:00Z'))).toBe('31-03-2027')
  })
})

describe('formatBytes', () => {
  it('uses B, KB, MB and GB', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(12.3 * 1024 * 1024)).toBe('12.3 MB')
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB')
  })
})
