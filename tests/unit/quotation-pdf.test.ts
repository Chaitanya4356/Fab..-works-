import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { renderQuotationPdf } from '@/modules/quotations/pdf-document'
import { quotationPdfModel, type QuotationPdfSource } from '@/modules/quotations/pdf-model'

const source: QuotationPdfSource = {
  quoteNo: 'QT/2026-27/0007', revision: 1, quoteDate: '2026-11-02', validUntil: '2026-11-17', title: 'Warehouse shed 40x80',
  siteAddress: 'Plot 12, IDA Jeedimetla', scope: 'Shed with sheeting', terms: '50% advance\nBalance on completion',
  gstRate: null, subtotal: 115000, gstAmount: 0, roundOff: 0, grandTotal: 115000,
  customer: { name: 'Sharma Steel Traders', address: '4-1-12 Abids', city: 'Hyderabad', state: 'Telangana', pincode: '500001', phone: '9876543210', gstin: null },
  items: [{ description: 'Supply, fabrication and erection as per scope of work', hsnSac: null, qty: 1, unit: 'job', rate: 115000, amount: 115000 }],
  workshop: { name: 'Sri Sai Fabricators', address: 'Plot 7, IDA Bollaram', city: 'Hyderabad', state: 'Telangana', pincode: '502325',
    phone: '9000000001', email: null, gstEnabled: false, gstin: null },
}

describe('quotation PDF', () => {
  it('shapes what the customer sees', () => {
    const model = quotationPdfModel(source)
    expect(model).toMatchObject({
      number: 'QT/2026-27/0007-R1', date: '02-11-2026', validUntil: '17-11-2026', subject: 'Warehouse shed 40x80',
      amountInWords: 'Rupees One Lakh Fifteen Thousand Only', terms: ['50% advance', 'Balance on completion'],
      signature: 'For Sri Sai Fabricators',
      totals: [{ label: 'Subtotal', value: '₹1,15,000.00' }, { label: 'Grand total', value: '₹1,15,000.00' }],
    })
    expect(model.items[0]).toMatchObject({ no: 1, qty: '1', unit: 'job', rate: '₹1,15,000.00', amount: '₹1,15,000.00' })
    expect(model.workshop.lines.join(' ')).not.toContain('GSTIN')
  })
  it('adds the GST line, the round off and the GSTIN when GST is on', () => {
    const model = quotationPdfModel({
      ...source, gstRate: 18, gstAmount: 20700, roundOff: 0.4, grandTotal: 135700.4,
      workshop: { ...source.workshop, gstEnabled: true, gstin: '36ABCDE1234F1Z5' },
    })
    expect(model.totals.map((t) => t.label)).toEqual(['Subtotal', 'GST @ 18%', 'Round off', 'Grand total'])
    expect(model.totals[1].value).toBe('₹20,700.00')
    expect(model.workshop.lines).toContain('GSTIN 36ABCDE1234F1Z5')
  })
  it('renders a PDF with the ₹ font embedded', async () => {
    const pdf = await renderQuotationPdf(quotationPdfModel(source), null)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pdf.toString('latin1')).toContain('NotoSans')
  })
})

describe('long terms', () => {
  /** How many lines of text each page draws: every text run is one "Tm" in that page's content stream. */
  const linesPerPage = (pdf: Buffer) => {
    const text = pdf.toString('latin1')
    const counts: number[] = []
    for (const m of text.matchAll(/stream\r?\n/g)) {
      const start = m.index! + m[0].length
      const end = text.indexOf('endstream', start)
      try {
        const runs = (inflateSync(pdf.subarray(start, end)).toString('latin1').match(/ Tm\b/g) ?? []).length
        if (runs > 0) counts.push(runs)
      } catch {
        // Not a compressed page stream (an image or a font): nothing to count.
      }
    }
    return counts
  }
  // An A4 page at this size holds about 60 lines; more than that on one page means text is drawn below its edge.
  const MOST_LINES_THAT_FIT = 80

  it('continue on the next page instead of running off the bottom', async () => {
    const terms = Array.from({ length: 150 }, (_, i) => `Term ${i + 1}: payment and delivery condition`).join('\n')
    const counts = linesPerPage(await renderQuotationPdf(quotationPdfModel({ ...source, terms }), null))
    expect(counts.length).toBeGreaterThan(2)
    expect(Math.max(...counts)).toBeLessThanOrEqual(MOST_LINES_THAT_FIT)
  })
  it('keep short terms on one page', async () => {
    expect(linesPerPage(await renderQuotationPdf(quotationPdfModel(source), null))).toHaveLength(1)
  })
})

