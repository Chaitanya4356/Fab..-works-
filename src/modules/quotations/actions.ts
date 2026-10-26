'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { activeUserForAction } from '@/lib/auth'
import { fail, ok, zodFieldErrors, type ActionResult } from '@/lib/action-result'
import { dbMessage } from '@/lib/db-errors'
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
