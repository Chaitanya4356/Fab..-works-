import { z } from 'zod'
import { financialYear } from './fy'

export const DOC_TYPES = ['project', 'quotation', 'invoice', 'dispatch', 'po'] as const
export type DocType = (typeof DOC_TYPES)[number]

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  project: 'Project',
  quotation: 'Quotation',
  invoice: 'Invoice',
  dispatch: 'Delivery note',
  po: 'Purchase order',
}

export type DocNumberFormat = {
  prefix: string
  separator: '/' | '-' | ''
  yearStyle: 'full' | 'short' | 'none'
  digits: number
}

/** The number a document gets. Must match public.next_doc_number exactly (spec 7.11). */
export function formatDocNumber(format: DocNumberFormat, isoDate: string, n: number): string {
  const fy = financialYear(isoDate)
  const year = format.yearStyle === 'full' ? fy : format.yearStyle === 'short' ? fy.slice(2) : null
  const sequence = String(n).padStart(format.digits, '0')
  return [format.prefix, year, sequence].filter((part): part is string => part !== null).join(format.separator)
}

const GST_INVOICE_MAX = 16

/** A GST invoice number may have at most 16 characters. */
export function gstInvoiceLengthMessage(format: DocNumberFormat, isoDate: string, nextNumber: number): string | null {
  const length = formatDocNumber(format, isoDate, nextNumber).length
  return length > GST_INVOICE_MAX
    ? `GST invoice numbers can have at most ${GST_INVOICE_MAX} characters. This format makes ${length}.`
    : null
}

const wholeNumber = (min: number, max: number, message: string) =>
  z.union([z.number(), z.string()]).transform((value, ctx) => {
    const text = String(value).trim()
    const n = Number(text)
    if (text === '' || !Number.isInteger(n) || n < min || n > max) {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }
    return n
  })

const formatEntry = z.object({
  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9/-]{0,9}$/, 'Use 1 to 10 letters, digits, - or /, starting with a letter or digit.'),
  separator: z.enum(['/', '-', '']),
  yearStyle: z.enum(['full', 'short', 'none']),
  digits: wholeNumber(1, 8, 'Choose from 1 to 8 digits.'),
  nextNumber: wholeNumber(1, 99_999_999, 'Enter a whole number, 1 or more.'),
})

export function makeDocNumberFormatsSchema(ctx: { gstEnabled: boolean; today: string }) {
  return z
    .object({
      project: formatEntry,
      quotation: formatEntry,
      invoice: formatEntry,
      dispatch: formatEntry,
      po: formatEntry,
    })
    .superRefine((formats, issues) => {
      const used = new Set<string>()
      for (const type of DOC_TYPES) {
        const prefix = formats[type].prefix
        if (used.has(prefix)) {
          issues.addIssue({ code: 'custom', path: [type, 'prefix'], message: 'Each document type needs its own prefix.' })
        }
        used.add(prefix)
      }
      if (ctx.gstEnabled) {
        const message = gstInvoiceLengthMessage(formats.invoice, ctx.today, formats.invoice.nextNumber)
        if (message) issues.addIssue({ code: 'custom', path: ['invoice', 'prefix'], message })
      }
    })
}
