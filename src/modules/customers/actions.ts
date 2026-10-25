'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { activeUserForAction } from '@/lib/auth'
import { fail, ok, zodFieldErrors, type ActionResult } from '@/lib/action-result'
import { dbMessage } from '@/lib/db-errors'
import { MESSAGES } from '@/lib/messages'
import { customerSchema, toCustomerRow } from './schema'

const idSchema = z.uuid()

export async function createCustomer(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  const parsed = customerSchema.safeParse(input)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))

  const { data, error } = await auth.data.supabase
    .from('customers')
    .insert({ ...toCustomerRow(parsed.data), name: parsed.data.name })
    .select('id')
    .single()
  if (error) return fail(dbMessage(error))
  revalidatePath('/customers')
  return ok({ id: data.id })
}

export async function updateCustomer(id: string, input: unknown): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (!idSchema.safeParse(id).success) return fail(MESSAGES.unexpected)
  const parsed = customerSchema.safeParse(input)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))

  const { data, error } = await auth.data.supabase
    .from('customers')
    .update(toCustomerRow(parsed.data))
    .eq('id', id)
    .select('id')
  if (error) return fail(dbMessage(error))
  if (!data.length) return fail(MESSAGES.unexpected)
  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  return ok(null)
}

/** Switched-off customers keep their history but are not offered for new projects. */
export async function setCustomerActive(id: string, active: boolean): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (!idSchema.safeParse(id).success || typeof active !== 'boolean') return fail(MESSAGES.unexpected)

  const { data, error } = await auth.data.supabase
    .from('customers')
    .update({ is_active: active })
    .eq('id', id)
    .select('id')
  if (error) return fail(dbMessage(error))
  if (!data.length) return fail(MESSAGES.unexpected)
  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  return ok(null)
}
