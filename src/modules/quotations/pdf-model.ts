import { formatDate, formatINR } from '@/lib/format'
import { amountInWords } from '@/lib/words'
import { quoteLabel } from './labels'

/** What the customer may see. There is no cost or margin here on purpose: the PDF never shows them (spec 7.1). */
export type QuotationPdfSource = {
  quoteNo: string
  revision: number
  quoteDate: string | null
  validUntil: string | null
  title: string
  siteAddress: string | null
  scope: string | null
  terms: string | null
  gstRate: number | null
  subtotal: number
  gstAmount: number
  roundOff: number
  grandTotal: number
  customer: {
    name: string
    address: string | null
    city: string | null
    state: string | null
    pincode: string | null
    phone: string | null
    gstin: string | null
  }
  items: { description: string; hsnSac: string | null; qty: number; unit: string | null; rate: number; amount: number }[]
  workshop: {
    name: string
    address: string | null
    city: string | null
    state: string | null
    pincode: string | null
    phone: string | null
    email: string | null
    gstEnabled: boolean
    gstin: string | null
  }
}

export type QuotationPdfModel = {
  workshop: { name: string; lines: string[] }
  number: string
  date: string
  validUntil: string | null
  customer: { name: string; lines: string[] }
  subject: string
  site: string | null
  scope: string | null
  items: { no: number; description: string; hsnSac: string; qty: string; unit: string; rate: string; amount: string }[]
  totals: { label: string; value: string }[]
  amountInWords: string
  terms: string[]
  signature: string
}

const present = (lines: (string | null | false | undefined)[]) => lines.filter((line): line is string => Boolean(line && line.trim()))

/** "Hyderabad, Telangana 500001" from whichever parts are known. */
const place = (city: string | null, state: string | null, pincode: string | null) =>
  [[city, state].filter(Boolean).join(', '), pincode].filter(Boolean).join(' ')

/** The quotation as printed: formatted text only, in the order the page shows it. */
export function quotationPdfModel(src: QuotationPdfSource): QuotationPdfModel {
  const { workshop, customer } = src
  const totals = [{ label: 'Subtotal', value: formatINR(src.subtotal) }]
  if (src.gstRate !== null) totals.push({ label: `GST @ ${Number(src.gstRate)}%`, value: formatINR(src.gstAmount) })
  if (Number(src.roundOff) !== 0) totals.push({ label: 'Round off', value: formatINR(src.roundOff) })
  totals.push({ label: 'Grand total', value: formatINR(src.grandTotal) })

  return {
    workshop: {
      name: workshop.name,
      lines: present([
        workshop.address,
        place(workshop.city, workshop.state, workshop.pincode),
        workshop.phone && `Phone ${workshop.phone}`,
        workshop.email,
        workshop.gstEnabled && workshop.gstin && `GSTIN ${workshop.gstin}`,
      ]),
    },
    number: quoteLabel(src.quoteNo, src.revision),
    date: src.quoteDate ? formatDate(src.quoteDate) : '',
    validUntil: src.validUntil ? formatDate(src.validUntil) : null,
    customer: {
      name: customer.name,
      lines: present([
        customer.address,
        place(customer.city, customer.state, customer.pincode),
        customer.phone && `Phone ${customer.phone}`,
        customer.gstin && `GSTIN ${customer.gstin}`,
      ]),
    },
    subject: src.title,
    site: src.siteAddress,
    scope: src.scope,
    items: src.items.map((item, i) => ({
      no: i + 1,
      description: item.description,
      hsnSac: item.hsnSac ?? '',
      qty: Number(item.qty).toLocaleString('en-IN', { maximumFractionDigits: 3 }),
      unit: item.unit ?? '',
      rate: formatINR(item.rate),
      amount: formatINR(item.amount),
    })),
    totals,
    amountInWords: amountInWords(src.grandTotal),
    terms: present((src.terms ?? '').split('\n').map((line) => line.trim())),
    signature: `For ${workshop.name}`,
  }
}
