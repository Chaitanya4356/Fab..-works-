'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { activeUserForAction } from '@/lib/auth'
import { fail, ok, zodFieldErrors, type ActionResult } from '@/lib/action-result'
import { todayIST } from '@/lib/dates'
import { dbMessage } from '@/lib/db-errors'
import { MESSAGES } from '@/lib/messages'
import { makeProjectSchema, toProjectRow } from './schema'

const idSchema = z.guid()
const SWITCHED_OFF = 'This customer is switched off. Switch them on first, or choose another customer.'

export async function createProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  const parsed = makeProjectSchema({ today: todayIST() }).safeParse(input)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))
  const { supabase } = auth.data

  const { data: customer } = await supabase.from('customers').select('is_active').eq('id', parsed.data.customerId).maybeSingle()
  if (!customer) return fail(MESSAGES.checkFields, { customerId: 'Choose a customer.' })
  if (!customer.is_active) return fail(MESSAGES.checkFields, { customerId: SWITCHED_OFF })

  const { data, error } = await supabase
    .from('projects')
    // project_no is always assigned by the database (projects_assign_number); this placeholder is ignored.
    .insert({ ...toProjectRow(parsed.data), project_no: '' })
    .select('id')
    .single()
  if (error) return fail(dbMessage(error))
  revalidatePath('/projects')
  revalidatePath(`/customers/${parsed.data.customerId}`)
  return ok({ id: data.id })
}

export async function updateProject(id: string, input: unknown): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (!idSchema.safeParse(id).success) return fail(MESSAGES.unexpected)
  const parsed = makeProjectSchema({ today: todayIST() }).safeParse(input)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))
  const { supabase } = auth.data

  const { data: current } = await supabase.from('projects').select('customer_id').eq('id', id).maybeSingle()
  if (!current) return fail(MESSAGES.unexpected)
  if (current.customer_id !== parsed.data.customerId) {
    // A project may keep a customer who was switched off later, but cannot be moved to one.
    const { data: customer } = await supabase.from('customers').select('is_active').eq('id', parsed.data.customerId).maybeSingle()
    if (!customer) return fail(MESSAGES.checkFields, { customerId: 'Choose a customer.' })
    if (!customer.is_active) return fail(MESSAGES.checkFields, { customerId: SWITCHED_OFF })
  }

  const { data, error } = await supabase.from('projects').update(toProjectRow(parsed.data)).eq('id', id).select('id')
  if (error) return fail(dbMessage(error))
  if (!data.length) return fail(MESSAGES.unexpected)
  revalidatePath('/projects')
  revalidatePath(`/projects/${id}`)
  revalidatePath(`/customers/${parsed.data.customerId}`)
  return ok(null)
}
