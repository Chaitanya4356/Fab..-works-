'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { activeUserForAction } from '@/lib/auth'
import { fail, ok, zodFieldErrors, type ActionResult } from '@/lib/action-result'
import { dbMessage } from '@/lib/db-errors'
import { optionalDate } from '@/lib/form-fields'
import { MESSAGES } from '@/lib/messages'
import { quotationSchema, toSaveArgs } from './schema'

const idSchema = z.guid()

/** Saves a draft quotation with all its lines; a null id starts a new one. The database works out every amount. */
export async function saveQuotation(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (id !== null && !idSchema.safeParse(id).success) return fail(MESSAGES.unexpected)
  const parsed = quotationSchema.safeParse(input)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))

  const args = toSaveArgs(parsed.data)
  const { data, error } = await auth.data.supabase.rpc('save_quotation_draft', {
    // A null id starts a new quotation; the generated argument type does not show that the function accepts it.
    p_quotation_id: id as string,
    p_header: args.header,
    p_cost_lines: args.costLines,
    p_items: args.items,
  })
  if (error) return fail(dbMessage(error))
  revalidatePath('/quotes')
  revalidatePath(`/quotes/${data}`)
  revalidatePath(`/customers/${parsed.data.customerId}`)
  return ok({ id: data })
}

const statusSchema = z.enum(['sent', 'accepted', 'rejected'])

function refreshQuotation(id: string) {
  revalidatePath('/quotes')
  revalidatePath(`/quotes/${id}`)
}

/** Draft → Sent → Accepted or Rejected; the database refuses any other step with a plain message. */
export async function setQuotationStatus(id: string, status: string, reason?: string): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  const parsedStatus = statusSchema.safeParse(status)
  if (!idSchema.safeParse(id).success || !parsedStatus.success) return fail(MESSAGES.unexpected)
  const note = typeof reason === 'string' ? reason.slice(0, 500) : undefined

  const { error } = await auth.data.supabase.rpc('set_quotation_status', {
    p_quotation_id: id,
    p_status: parsedStatus.data,
    p_reason: note,
  })
  if (error) return fail(dbMessage(error))
  refreshQuotation(id)
  return ok(null)
}

/** Copies a sent or rejected quotation into its next revision, as a draft to edit. */
export async function reviseQuotation(id: string): Promise<ActionResult<{ id: string }>> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (!idSchema.safeParse(id).success) return fail(MESSAGES.unexpected)

  const { data, error } = await auth.data.supabase.rpc('create_quotation_revision', { p_quotation_id: id })
  if (error) return fail(dbMessage(error))
  refreshQuotation(id)
  return ok({ id: data })
}

const followUpSchema = z.object({ date: optionalDate() })

/** The follow-up date can change at any stage (spec 6.5); a blank clears it. */
export async function setFollowUpDate(id: string, date: string): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (!idSchema.safeParse(id).success) return fail(MESSAGES.unexpected)
  const parsed = followUpSchema.safeParse({ date })
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))

  const { data, error } = await auth.data.supabase
    .from('quotations')
    .update({ follow_up_date: parsed.data.date })
    .eq('id', id)
    .select('id')
  if (error) return fail(dbMessage(error))
  if (!data.length) return fail(MESSAGES.unexpected)
  refreshQuotation(id)
  return ok(null)
}
