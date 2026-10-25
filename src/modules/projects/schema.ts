import { z } from 'zod'
import { optionalDate, optionalRupees, optionalText, rupeesOrZero } from '@/lib/form-fields'
import type { Database } from '@/lib/supabase/database.types'
import { PROJECT_STATUSES } from './labels'

export function makeProjectSchema(ctx: { today: string }) {
  return z
    .object({
      // Any well-formed UUID; the database's foreign key checks the customer exists.
      customerId: z.guid('Choose a customer.'),
      title: z.string().trim().min(2, 'Enter a project title.').max(150, 'Use at most 150 characters.'),
      siteAddress: optionalText(300),
      description: optionalText(2000),
      status: z.enum(PROJECT_STATUSES, 'Choose a status.'),
      startDate: optionalDate(),
      dueDate: optionalDate(),
      completedDate: optionalDate(),
      contractValue: optionalRupees(),
      estMaterial: rupeesOrZero(),
      estLabour: rupeesOrZero(),
      estPainting: rupeesOrZero(),
      estTransport: rupeesOrZero(),
      estOther: rupeesOrZero(),
      notes: optionalText(2000),
    })
    .superRefine((p, issues) => {
      if (p.startDate && p.dueDate && p.dueDate < p.startDate) {
        issues.addIssue({ code: 'custom', path: ['dueDate'], message: 'The due date can’t be before the start date.' })
      }
    })
    .transform((p) => ({
      ...p,
      // A completed project needs a completion date (today unless given); any other status has none.
      completedDate: p.status === 'completed' ? (p.completedDate ?? ctx.today) : null,
    }))
}

export type ProjectInput = z.output<ReturnType<typeof makeProjectSchema>>

export function toProjectRow(p: ProjectInput): Database['public']['Tables']['projects']['Update'] & {
  customer_id: string
  title: string
} {
  return {
    customer_id: p.customerId,
    title: p.title,
    site_address: p.siteAddress,
    description: p.description,
    status: p.status,
    start_date: p.startDate,
    due_date: p.dueDate,
    completed_date: p.completedDate,
    contract_value: p.contractValue,
    est_material: p.estMaterial,
    est_labour: p.estLabour,
    est_painting: p.estPainting,
    est_transport: p.estTransport,
    est_other: p.estOther,
    notes: p.notes,
  }
}
