// Kept out of the 'use client' editor file: Server Components need the real functions, not client references.
import type { CostLineDraft, ItemDraft } from './maths'
import type { QuotationDetail } from './queries'

export type QuotationFormValues = {
  customerId: string
  title: string
  siteAddress: string
  scope: string
  terms: string
  enquiryDate: string
  quoteDate: string
  validUntil: string
  followUpDate: string
  marginPercent: string
  costLines: CostLineDraft[]
  items: ItemDraft[]
}

const addDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** A blank quotation with the Settings defaults; the site starts as the customer's address (spec 5). */
export function newQuotationValues(defaults: {
  today: string
  validityDays: number
  margin: number
  terms: string | null
  customer?: { id: string; address: string | null }
}): QuotationFormValues {
  return {
    customerId: defaults.customer?.id ?? '',
    title: '',
    siteAddress: defaults.customer?.address ?? '',
    scope: '',
    terms: defaults.terms ?? '',
    enquiryDate: '',
    quoteDate: defaults.today,
    validUntil: addDays(defaults.today, defaults.validityDays),
    followUpDate: '',
    marginPercent: String(defaults.margin),
    costLines: [],
    items: [],
  }
}

export function quotationFormValues(q: QuotationDetail): QuotationFormValues {
  return {
    customerId: q.customer_id,
    title: q.title,
    siteAddress: q.site_address ?? '',
    scope: q.scope ?? '',
    terms: q.terms ?? '',
    enquiryDate: q.enquiry_date ?? '',
    quoteDate: q.quote_date ?? '',
    validUntil: q.valid_until ?? '',
    followUpDate: q.follow_up_date ?? '',
    marginPercent: String(q.margin_percent),
    costLines: q.costLines.map((l) => ({
      category: l.category,
      description: l.description,
      qty: String(l.qty),
      unit: l.unit ?? '',
      costRate: String(l.costRate),
    })),
    items: q.items.map((i) => ({
      description: i.description,
      hsnSac: i.hsnSac ?? '',
      qty: String(i.qty),
      unit: i.unit ?? '',
      rate: String(i.rate),
    })),
  }
}
