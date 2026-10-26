import { STATUS_LABELS, type QuotationStatus } from '../labels'

const STYLES: Record<QuotationStatus, string> = {
  draft: 'border-line text-muted',
  sent: 'border-ink/30 bg-ground text-ink',
  accepted: 'border-ok/40 bg-ok/10 text-ok',
  rejected: 'border-oxide/40 text-oxide',
  superseded: 'border-line text-muted line-through',
}

export function QuotationStatusPill({ status }: { status: QuotationStatus }) {
  return <span className={`rounded border px-2 py-0.5 text-xs ${STYLES[status]}`}>{STATUS_LABELS[status]}</span>
}

export function FollowUpPill() {
  return <span className="rounded border border-oxide bg-oxide/10 px-2 py-0.5 text-xs font-medium text-oxide">Follow up</span>
}
