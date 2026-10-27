import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { safeFileName, type AttachmentEntityType } from './paths'

/** A shared link works for 7 days (spec 4.6). */
export const SHARE_LINK_SECONDS = 7 * 24 * 60 * 60

/**
 * Keeps a copy of a generated file for sharing, replacing the previous copy for that record,
 * and returns a link that opens it for 7 days. Not recorded as an attachment: it is a copy, not a record's file.
 */
export async function storeSharedFile(
  supabase: SupabaseClient<Database>,
  target: { entityType: AttachmentEntityType; entityId: string },
  fileName: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const path = `share/${target.entityType}/${target.entityId}/${safeFileName(fileName)}`
  const { error } = await supabase.storage.from('files').upload(path, body, { upsert: true, contentType })
  if (error) throw error
  const { data, error: linkError } = await supabase.storage.from('files').createSignedUrl(path, SHARE_LINK_SECONDS)
  if (linkError) throw linkError
  return data.signedUrl
}
