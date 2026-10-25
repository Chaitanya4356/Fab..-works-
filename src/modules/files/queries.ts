import 'server-only'
import { requireActiveUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { AttachmentEntityType } from './paths'

export type AttachmentRow = {
  id: string
  fileName: string
  mimeType: string | null
  sizeBytes: number | null
  caption: string | null
  createdAt: string
  url: string | null
  isImage: boolean
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SIGNED_URL_SECONDS = 600

/** A record's files, newest first, each with a 10-minute link. */
export async function listAttachments(entityType: AttachmentEntityType, entityId: string): Promise<AttachmentRow[]> {
  await requireActiveUser()
  if (!GUID.test(entityId)) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attachments')
    .select('id, file_path, file_name, mime_type, size_bytes, caption, created_at')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!data.length) return []

  const { data: signed } = await supabase.storage
    .from('files')
    .createSignedUrls(data.map((a) => a.file_path), SIGNED_URL_SECONDS)
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))

  return data.map((a) => ({
    id: a.id,
    fileName: a.file_name ?? a.file_path.split('/').pop()!,
    mimeType: a.mime_type,
    sizeBytes: a.size_bytes,
    caption: a.caption,
    createdAt: a.created_at,
    url: urls.get(a.file_path) ?? null,
    isImage: (a.mime_type ?? '').startsWith('image/'),
  }))
}

export async function countAttachments(entityType: AttachmentEntityType, entityId: string): Promise<number> {
  await requireActiveUser()
  if (!GUID.test(entityId)) return 0
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('attachments')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
  if (error) throw error
  return count ?? 0
}
