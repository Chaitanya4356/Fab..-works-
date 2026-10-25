import { expect, it } from 'vitest'
import { lastPage, pageFromParam, pageRange } from '@/lib/paging'

it('reads a page number, falling back to 1', () => {
  expect(pageFromParam('3')).toBe(3)
  expect(pageFromParam(undefined)).toBe(1)
  expect(pageFromParam('abc')).toBe(1)
  expect(pageFromParam('0')).toBe(1)
  expect(pageFromParam('-2')).toBe(1)
  expect(pageFromParam('2.5')).toBe(1)
})
it('pages 50 rows at a time', () => {
  expect(pageRange(1)).toEqual({ from: 0, to: 49 })
  expect(pageRange(2)).toEqual({ from: 50, to: 99 })
  expect(lastPage(132)).toBe(3)
  expect(lastPage(50)).toBe(1)
  expect(lastPage(0)).toBe(1)
})
