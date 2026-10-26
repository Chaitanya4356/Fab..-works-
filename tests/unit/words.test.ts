import { expect, it } from 'vitest'
import { amountInWords } from '@/lib/words'

it('writes amounts the Indian way (E11)', () => {
  expect(amountInWords(120000)).toBe('Rupees One Lakh Twenty Thousand Only')
  expect(amountInWords('23550075.50')).toBe('Rupees Two Crore Thirty Five Lakh Fifty Thousand Seventy Five and Fifty Paise Only')
})
it.each([
  [0, 'Rupees Zero Only'],
  [1, 'Rupees One Only'],
  [101, 'Rupees One Hundred One Only'],
  [115000, 'Rupees One Lakh Fifteen Thousand Only'],
  [999999999, 'Rupees Ninety Nine Crore Ninety Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine Only'],
  [1000000000, 'Rupees One Hundred Crore Only'],
  ['0.05', 'Rupees Zero and Five Paise Only'],
])('writes %s in words', (amount, words) => {
  expect(amountInWords(amount)).toBe(words)
})
