'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { activeUserForAction } from '@/lib/auth'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { dbMessage } from '@/lib/db-errors'
import { MESSAGES } from '@/lib/messages'
import { MAX_FILE_BYTES } from '@/lib/upload/rules'
import {
  ATTACHMENT_ENTITY_TYPES,
  attachmentPathBelongs,
  buildObjectPath,
  type AttachmentEntityType,
  type UploadTarget,
} from './paths'

const SIGNED_URL_SECONDS = 600

const targetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('logo') }),
  z.object({
    kind: z.literal('attachment'),
    entityType: z.enum(ATTACHMENT_ENTITY_TYPES),
    entityId: z.guid(),
  }),
])

/** Records that have a screen with files so far, and the page that lists their files. Later stages add theirs. */
const FILE_OWNERS: Partial<Record<AttachmentEntityType, { table: 'projects' | 'workers'; page: (id: string) => string }>> = {
  project: { table: 'projects', page: (id) => `/projects/${id}/files` },
  worker: { table: 'workers', page: (id) => `/workers/${id}` },
}

const recordSchema = z.object({
  entityType: z.enum(ATTACHMENT_ENTITY_TYPES),
  entityId: z.guid(),
  path: z.string().min(1).max(500),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().max(200).nullable(),
  sizeBytes: z.number().int().min(0).max(MAX_FILE_BYTES),
})

/** Step 3 of an upload: after the browser has stored the file, list it against its record. */
export async function recordAttachment(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  const parsed = recordSchema.safeParse(input)
  if (!parsed.success) return fail(MESSAGES.unexpected)
  const { entityType, entityId, path, fileName, mimeType, sizeBytes } = parsed.data
  const owner = FILE_OWNERS[entityType]
  if (!owner || !attachmentPathBelongs(entityType, entityId, path)) return fail(MESSAGES.unexpected)

  const { supabase } = auth.data
  const { data: record } = await supabase.from(owner.table).select('id').eq('id', entityId).maybeSingle()
  if (!record) return fail(MESSAGES.unexpected)

  const { data, error } = await supabase
    .from('attachments')
    .insert({ entity_type: entityType, entity_id: entityId, file_path: path, file_name: fileName, mime_type: mimeType, size_bytes: sizeBytes })
    .select('id')
    .single()
  if (error) return fail(dbMessage(error))
  revalidatePath(owner.page(entityId))
  return ok({ id: data.id })
}

/** Removes a wrongly added file: its listing and the stored file, so the space comes back. */
export async function removeAttachment(id: string): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (!z.guid().safeParse(id).success) return fail(MESSAGES.unexpected)
  const { supabase } = auth.data

  const { data: row } = await supabase
    .from('attachments')
    .select('file_path, entity_type, entity_id')
    .eq('id', id)
    .maybeSingle()
  if (!row) return fail(MESSAGES.unexpected)

  const { data: deleted, error } = await supabase.from('attachments').delete().eq('id', id).select('id')
  if (error) return fail(dbMessage(error))
  if (!deleted.length) return fail(MESSAGES.unexpected)

  const { error: storageError } = await supabase.storage.from('files').remove([row.file_path])
  if (storageError) console.error('could not remove a stored file', row.file_path, storageError)

  const owner = FILE_OWNERS[row.entity_type as AttachmentEntityType]
  if (owner) revalidatePath(owner.page(row.entity_id))
  return ok(null)
}

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
