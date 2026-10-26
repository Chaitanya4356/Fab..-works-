import { parsePaise } from './money'

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
  'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function belowHundred(n: number): string {
  return n < 20 ? ONES[n] : [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(' ')
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100)
  return [hundreds && `${ONES[hundreds]} Hundred`, n % 100 && belowHundred(n % 100)].filter(Boolean).join(' ')
}

/** A whole number the Indian way: crore, lakh, thousand, hundred. Crores above 99 are spelled the same way. */
function indian(n: number): string {
  const crore = Math.floor(n / 10_000_000)
  const lakh = Math.floor((n % 10_000_000) / 100_000)
  const thousand = Math.floor((n % 100_000) / 1000)
  return [
    crore && `${indian(crore)} Crore`,
    lakh && `${belowHundred(lakh)} Lakh`,
    thousand && `${belowHundred(thousand)} Thousand`,
    n % 1000 && belowThousand(n % 1000),
  ]
    .filter(Boolean)
    .join(' ')
}

/** An amount in words for quotations and invoices (E11): "Rupees One Lakh Twenty Thousand Only". */
export function amountInWords(amount: number | string): string {
  const paise = parsePaise(amount)
  if (paise === null) throw new Error(`Not an amount: ${amount}`)
  const rupees = Number(paise / 100n)
  const rest = Number(paise % 100n)
  return `Rupees ${rupees === 0 ? 'Zero' : indian(rupees)}${rest ? ` and ${belowHundred(rest)} Paise` : ''} Only`
}
