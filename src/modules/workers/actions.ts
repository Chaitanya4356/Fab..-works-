'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { activeUserForAction } from '@/lib/auth'
import { fail, ok, zodFieldErrors, type ActionResult } from '@/lib/action-result'
import { dbMessage } from '@/lib/db-errors'
import { MESSAGES } from '@/lib/messages'
import { toWorkerRow, workerSchema } from './schema'

const idSchema = z.guid()

export async function createWorker(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  const parsed = workerSchema.safeParse(input)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))

  const { data, error } = await auth.data.supabase
    .from('workers')
    .insert({ ...toWorkerRow(parsed.data), full_name: parsed.data.fullName })
    .select('id')
    .single()
  if (error) return fail(dbMessage(error))
  revalidatePath('/workers')
  return ok({ id: data.id })
}

export async function updateWorker(id: string, input: unknown): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (!idSchema.safeParse(id).success) return fail(MESSAGES.unexpected)
  const parsed = workerSchema.safeParse(input)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))

  const { data, error } = await auth.data.supabase.from('workers').update(toWorkerRow(parsed.data)).eq('id', id).select('id')
  if (error) return fail(dbMessage(error))
  if (!data.length) return fail(MESSAGES.unexpected)
  revalidatePath('/workers')
  revalidatePath(`/workers/${id}`)
  return ok(null)
}

/** Switched-off workers keep their history but are not offered for project teams. */
export async function setWorkerActive(id: string, active: boolean): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (!idSchema.safeParse(id).success || typeof active !== 'boolean') return fail(MESSAGES.unexpected)

  const { data, error } = await auth.data.supabase
    .from('workers')
    .update({ status: active ? 'active' : 'inactive' })
    .eq('id', id)
    .select('id')
  if (error) return fail(dbMessage(error))
  if (!data.length) return fail(MESSAGES.unexpected)
  revalidatePath('/workers')
  revalidatePath(`/workers/${id}`)
  return ok(null)
}
