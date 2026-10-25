import { STATUS_LABELS, type ProjectStatus } from '../labels'

const STYLES: Record<ProjectStatus, string> = {
  planned: 'border-line text-muted',
  in_progress: 'border-ink/30 bg-ground text-ink',
  on_hold: 'border-oxide/40 text-oxide',
  completed: 'border-ok/40 bg-ok/10 text-ok',
  cancelled: 'border-line text-muted line-through',
}

export function StatusPill({ status }: { status: ProjectStatus }) {
  return <span className={`rounded border px-2 py-0.5 text-xs ${STYLES[status]}`}>{STATUS_LABELS[status]}</span>
}

export function OverduePill() {
  return <span className="rounded border border-oxide bg-oxide/10 px-2 py-0.5 text-xs font-medium text-oxide">Overdue</span>
}
