import { expect, it } from 'vitest'
import { LUMP_SUM_DESCRIPTION, pdfFileName, quoteLabel } from '@/modules/quotations/labels'
import { generateItems, quotationTotals, storedTotals, type CostLineDraft } from '@/modules/quotations/maths'

const costSheet: CostLineDraft[] = [
  { category: 'material', description: 'Steel sections', qty: '1', unit: 'lot', costRate: '60000' },
  { category: 'labour', description: 'Fabrication and erection', qty: '1', unit: 'job', costRate: '25000' },
  { category: 'painting', description: 'Primer and enamel', qty: '1', unit: 'job', costRate: '10000' },
  { category: 'transport', description: 'Two trips', qty: '1', unit: 'job', costRate: '5000' },
]

it('prices a ₹1,00,000 cost sheet at 15% as one lump sum (E10)', () => {
  const items = generateItems(costSheet, '15', 'lump_sum')
  expect(items).toEqual([{ description: LUMP_SUM_DESCRIPTION, hsnSac: '', qty: '1', unit: 'job', rate: '115000.00' }])
  expect(quotationTotals({ costLines: costSheet, items, gstRate: null })).toEqual({
    costTotal: 10000000n, subtotal: 11500000n, gstAmount: 0n, roundOff: 0n, grandTotal: 11500000n,
    profit: 1500000n, profitPercent: '13.04',
  })
})

it('prices line by line with the margin on each cost rate', () => {
  const lines: CostLineDraft[] = [{ category: 'material', description: 'ISA 40x40x5', qty: '12.5', unit: 'm', costRate: '191' }]
  const items = generateItems(lines, '15', 'itemised')
  expect(items).toEqual([{ description: 'ISA 40x40x5', hsnSac: '', qty: '12.5', unit: 'm', rate: '219.65' }])
  expect(quotationTotals({ costLines: [], items, gstRate: null })).toMatchObject({
    subtotal: 274563n, roundOff: 37n, grandTotal: 274600n,
  })
})

it('adds GST when it is on and rounds the grand total to the rupee', () => {
  const gate = { description: 'MS gate', hsnSac: '7308', qty: '1', unit: 'nos', rate: '99999.50' }
  expect(quotationTotals({ costLines: [], items: [gate], gstRate: null })).toMatchObject({ grandTotal: 10000000n, roundOff: 50n })
  expect(quotationTotals({ costLines: [], items: [{ ...gate, rate: '100000' }], gstRate: '18' })).toMatchObject({
    subtotal: 10000000n, gstAmount: 1800000n, grandTotal: 11800000n, roundOff: 0n,
  })
})

it('counts lines that are not filled in yet as nothing', () => {
  const totals = quotationTotals({
    costLines: [{ category: 'other', description: 'x', qty: '', unit: '', costRate: 'abc' }], items: [], gstRate: null,
  })
  expect(totals).toMatchObject({ costTotal: 0n, subtotal: 0n, grandTotal: 0n, profitPercent: '0.00' })
})

it('reads stored totals back with the profit', () => {
  expect(storedTotals({ cost_total: 100000, subtotal: 115000, gst_amount: 0, round_off: 0, grand_total: 115000 }))
    .toMatchObject({ profit: 1500000n, profitPercent: '13.04' })
})

it('names revisions and their PDF files', () => {
  expect(quoteLabel('QT/2026-27/0001', 0)).toBe('QT/2026-27/0001')
  expect(quoteLabel('QT/2026-27/0001', 2)).toBe('QT/2026-27/0001-R2')
  expect(pdfFileName('QT/2026-27/0001-R2')).toBe('QT-2026-27-0001-R2.pdf')
})
