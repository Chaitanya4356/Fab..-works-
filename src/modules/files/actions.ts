'use server'

import { z } from 'zod'
import { activeUserForAction } from '@/lib/auth'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { MESSAGES } from '@/lib/messages'
import { buildObjectPath, type UploadTarget } from './paths'

const SIGNED_URL_SECONDS = 600

const targetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('logo') }),
  z.object({
    kind: z.literal('attachment'),
    entityType: z.enum([
      'customer', 'supplier', 'worker', 'project', 'quotation',
      'activity_update', 'purchase_bill', 'dispatch', 'expense',
    ]),
    entityId: z.uuid(),
  }),
])

/** A one-time URL the browser uploads straight to, so files never pass through the app server. */
export async function createSignedUpload(
  target: UploadTarget,
  fileName: string,
): Promise<ActionResult<{ path: string; token: string }>> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  const parsedTarget = targetSchema.safeParse(target)
  if (!parsedTarget.success || typeof fileName !== 'string') return fail(MESSAGES.unexpected)

  const path = buildObjectPath(parsedTarget.data, fileName, crypto.randomUUID())
  const { data, error } = await auth.data.supabase.storage.from('files').createSignedUploadUrl(path)
  if (error) {
    console.error('createSignedUpload failed', error)
    return fail(MESSAGES.unexpected)
  }
  return ok({ path: data.path, token: data.token })
}

/** A link to a private file that stops working after 10 minutes. */
export async function getFileUrl(path: string): Promise<ActionResult<{ url: string }>> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (typeof path !== 'string' || path === '') return fail(MESSAGES.unexpected)

  const { data, error } = await auth.data.supabase.storage.from('files').createSignedUrl(path, SIGNED_URL_SECONDS)
  if (error) {
    console.error('getFileUrl failed', error)
    return fail(MESSAGES.unexpected)
  }
  return ok({ url: data.signedUrl })
}
