export const COST_CATEGORIES = ['material', 'labour', 'painting', 'transport', 'other'] as const
export type CostCategory = (typeof COST_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<CostCategory, string> = {
  material: 'Material',
  labour: 'Labour',
  painting: 'Painting',
  transport: 'Transport',
  other: 'Other',
}

export const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'superseded'] as const
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number]

export const STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  superseded: 'Replaced',
}

/** The one customer item of a lump-sum price (spec 7.1). */
export const LUMP_SUM_DESCRIPTION = 'Supply, fabrication and erection as per scope of work'

/** "QT/2026-27/0001" for the first revision, "QT/2026-27/0001-R1" after that. */
export function quoteLabel(quoteNo: string, revision: number): string {
  return revision > 0 ? `${quoteNo}-R${revision}` : quoteNo
}

export function pdfFileName(label: string): string {
  return `${label.replaceAll('/', '-')}.pdf`
}
