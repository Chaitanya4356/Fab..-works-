import { expect, it } from 'vitest'
import { toSearch } from '@/lib/search'

it('makes a contains-pattern from tidy text', () => {
  expect(toSearch('  Sharma   Steel ')).toEqual({ text: '%Sharma Steel%', digits: null })
})
it('also searches phone numbers by their digits', () => {
  expect(toSearch('98765 43210')).toEqual({ text: '%98765 43210%', digits: '%9876543210%' })
  expect(toSearch('PRJ/2026-27/0001')).toEqual({ text: '%PRJ/2026-27/0001%', digits: '%2026270001%' })
})
it('keeps brackets, commas and apostrophes as one-character wildcards so exact names still match', () => {
  expect(toSearch('Sharma, (Hyd)')).toEqual({ text: '%Sharma_ _Hyd_%', digits: null })
  expect(toSearch("D'Souza")?.text).toBe('%D_Souza%')
  expect(toSearch('Sai Steels (P) Ltd')?.text).toBe('%Sai Steels _P_ Ltd%')
  expect(toSearch('50% "off"')).toEqual({ text: '%50 off%', digits: null })
})
it('treats an empty or symbol-only search as no search', () => {
  expect(toSearch(undefined)).toBeNull()
  expect(toSearch('   ')).toBeNull()
  expect(toSearch('%,()')).toBeNull()
})
it('finds a mobile number however it was typed', () => {
  expect(toSearch('+91 98765 43210')?.digits).toBe('%9876543210%')
  expect(toSearch('098765 43210')?.digits).toBe('%9876543210%')
  expect(toSearch('919876543210')?.digits).toBe('%9876543210%')
})
