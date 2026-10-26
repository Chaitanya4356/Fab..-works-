'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { activeUserForAction } from '@/lib/auth'
import { fail, ok, zodFieldErrors, type ActionResult } from '@/lib/action-result'
import { dbMessage } from '@/lib/db-errors'
import { todayIST } from '@/lib/dates'
import { MESSAGES } from '@/lib/messages'
import { lastDayProblem, lastDaySchema, teamPlaceSchema } from './schema'

const idSchema = z.guid()

function refreshTeamPages(projectId: string, workerId: string) {
  revalidatePath(`/projects/${projectId}`, 'layout')
  revalidatePath(`/workers/${workerId}`)
}

/** Puts an active worker on a project's team. A worker is on a team at most once at a time. */
export async function addToTeam(projectId: string, input: unknown): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (!idSchema.safeParse(projectId).success) return fail(MESSAGES.unexpected)
  const parsed = teamPlaceSchema.safeParse(input)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))
  const { workerId, role, fromDate } = parsed.data
  const { supabase } = auth.data

  const { data: worker } = await supabase.from('workers').select('full_name, status').eq('id', workerId).maybeSingle()
  if (!worker || worker.status !== 'active') {
    return fail('This worker is switched off. Switch them on before adding them to a team.')
  }

  const { error } = await supabase
    .from('project_workers')
    .insert({ project_id: projectId, worker_id: workerId, role, from_date: fromDate })
  if (error?.code === '23505') return fail(`${worker.full_name} is already on this team.`)
  if (error) return fail(dbMessage(error))
  refreshTeamPages(projectId, workerId)
  return ok(null)
}

/** Takes a worker off a team by giving their place a last day. The place stays as team history. */
export async function endTeamPlace(placeId: string, input: unknown): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (!idSchema.safeParse(placeId).success) return fail(MESSAGES.unexpected)
  const parsed = lastDaySchema.safeParse(input)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))
  const { lastDay } = parsed.data
  const { supabase } = auth.data

  const { data: place } = await supabase
    .from('project_workers')
    .select('project_id, worker_id, from_date')
    .eq('id', placeId)
    .maybeSingle()
  if (!place) return fail(MESSAGES.unexpected)
  const problem = lastDayProblem(lastDay, place.from_date, todayIST())
  if (problem) return fail(MESSAGES.checkFields, { lastDay: problem })

  // Only an open place is ended; one already taken off (another screen, a double tap) is left as it is.
  const { error } = await supabase.from('project_workers').update({ to_date: lastDay }).eq('id', placeId).is('to_date', null)
  if (error) return fail(dbMessage(error))
  refreshTeamPages(place.project_id, place.worker_id)
  return ok(null)
}
