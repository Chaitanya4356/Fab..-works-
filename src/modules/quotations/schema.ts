import { z } from 'zod'
import { optionalCode, optionalDate, optionalText, percent, quantity, requiredRupees } from '@/lib/form-fields'
import { COST_CATEGORIES } from './labels'

const costLineSchema = z.object({
  category: z.enum(COST_CATEGORIES, 'Choose a category.'),
  description: z.string().trim().min(1, 'Describe this cost.').max(200, 'Use at most 200 characters.'),
  qty: quantity(),
  unit: optionalText(20),
  costRate: requiredRupees(),
})

const itemSchema = z.object({
  description: z.string().trim().min(1, 'Describe this item.').max(500, 'Use at most 500 characters.'),
  hsnSac: optionalCode(/^\d{4,8}$/, 'Enter a 4 to 8 digit HSN or SAC code.'),
  qty: quantity(),
  unit: optionalText(20),
  rate: requiredRupees(),
})

export const quotationSchema = z
  .object({
    customerId: z.guid('Choose a customer.'),
    title: z.string().trim().min(2, 'Enter what the quotation is for.').max(200, 'Use at most 200 characters.'),
    siteAddress: optionalText(500),
    scope: optionalText(4000),
    terms: optionalText(4000),
    enquiryDate: optionalDate(),
    quoteDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the quotation date.'),
    validUntil: optionalDate(),
    followUpDate: optionalDate(),
    marginPercent: percent(),
    costLines: z.array(costLineSchema).max(100, 'Use at most 100 cost lines.'),
    items: z.array(itemSchema).max(100, 'Use at most 100 items.'),
  })
  .superRefine((q, ctx) => {
    if (q.validUntil && q.validUntil < q.quoteDate) {
      ctx.addIssue({ code: 'custom', path: ['validUntil'], message: 'Valid until cannot be before the quotation date.' })
    }
  })

export type QuotationInput = z.output<typeof quotationSchema>

/** The arguments of save_quotation_draft, in the database's own names. */
export function toSaveArgs(q: QuotationInput) {
  return {
    header: {
      customer_id: q.customerId,
      title: q.title,
      site_address: q.siteAddress,
      scope: q.scope,
      terms: q.terms,
      enquiry_date: q.enquiryDate,
      quote_date: q.quoteDate,
      valid_until: q.validUntil,
      follow_up_date: q.followUpDate,
      margin_percent: q.marginPercent,
    },
    costLines: q.costLines.map((l) => ({
      category: l.category,
      description: l.description,
      qty: l.qty,
      unit: l.unit,
      cost_rate: l.costRate,
    })),
    items: q.items.map((i) => ({ description: i.description, hsn_sac: i.hsnSac, qty: i.qty, unit: i.unit, rate: i.rate })),
  }
}
