export const PROJECT_STATUSES = ['planned', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const ESTIMATE_FIELDS = [
  { key: 'estMaterial', column: 'est_material', label: 'Material' },
  { key: 'estLabour', column: 'est_labour', label: 'Labour' },
  { key: 'estPainting', column: 'est_painting', label: 'Painting' },
  { key: 'estTransport', column: 'est_transport', label: 'Transport' },
  { key: 'estOther', column: 'est_other', label: 'Other' },
] as const
