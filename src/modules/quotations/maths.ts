import { addMargin, lineAmount, paiseToRupees, parseMilli, parsePaise, percentOf } from '@/lib/money'
import { LUMP_SUM_DESCRIPTION, type CostCategory } from './labels'

export type CostLineDraft = { category: CostCategory; description: string; qty: string; unit: string; costRate: string }
export type ItemDraft = { description: string; hsnSac: string; qty: string; unit: string; rate: string }

/** All amounts in paise. */
export type QuotationTotals = {
  costTotal: bigint
  subtotal: bigint
  gstAmount: bigint
  roundOff: bigint
  grandTotal: bigint
  profit: bigint
  profitPercent: string
}

const amountOf = (qty: string, rate: string) => {
  const q = parseMilli(qty)
  const r = parsePaise(rate)
  return q === null || r === null ? 0n : lineAmount(q, r)
}
const sum = (values: bigint[]) => values.reduce((total, v) => total + v, 0n)

/** Customer items priced from the cost sheet: one lump sum, or one item per cost line (spec 7.1). */
export function generateItems(lines: CostLineDraft[], marginPercent: string, mode: 'lump_sum' | 'itemised'): ItemDraft[] {
  if (mode === 'lump_sum') {
    const cost = sum(lines.map((l) => amountOf(l.qty, l.costRate)))
    return [{ description: LUMP_SUM_DESCRIPTION, hsnSac: '', qty: '1', unit: 'job', rate: paiseToRupees(addMargin(cost, marginPercent)) }]
  }
  return lines.map((l) => ({
    description: l.description,
    hsnSac: '',
    qty: l.qty,
    unit: l.unit,
    rate: paiseToRupees(addMargin(parsePaise(l.costRate) ?? 0n, marginPercent)),
  }))
}

function withGrandTotal(costTotal: bigint, subtotal: bigint, gstAmount: bigint, grandTotal?: bigint): QuotationTotals {
  const beforeRounding = subtotal + gstAmount
  // Half up to the rupee; amounts here are never negative.
  const rounded = grandTotal ?? ((beforeRounding + 50n) / 100n) * 100n
  const profit = subtotal - costTotal
  return {
    costTotal,
    subtotal,
    gstAmount,
    roundOff: rounded - beforeRounding,
    grandTotal: rounded,
    profit,
    profitPercent: percentOf(profit, subtotal),
  }
}

/** The live totals the editor shows; the database stores the same figures when the draft is saved. */
export function quotationTotals(input: { costLines: CostLineDraft[]; items: ItemDraft[]; gstRate: string | null }): QuotationTotals {
  const costTotal = sum(input.costLines.map((l) => amountOf(l.qty, l.costRate)))
  const subtotal = sum(input.items.map((i) => amountOf(i.qty, i.rate)))
  const gstAmount = input.gstRate === null ? 0n : addMargin(subtotal, input.gstRate) - subtotal
  return withGrandTotal(costTotal, subtotal, gstAmount)
}

const fromStored = (rupees: number) => BigInt(Math.round(rupees * 100))

/** A saved quotation's totals, with the profit worked out from them. */
export function storedTotals(row: {
  cost_total: number
  subtotal: number
  gst_amount: number
  round_off: number
  grand_total: number
}): QuotationTotals {
  return withGrandTotal(fromStored(row.cost_total), fromStored(row.subtotal), fromStored(row.gst_amount), fromStored(row.grand_total))
}
