import { createSignedUpload } from '@/modules/files/actions'
import type { UploadTarget } from '@/modules/files/paths'
import { createBrowserSupabase } from '@/lib/supabase/browser'
import { MAX_FILE_BYTES, validateFile } from './rules'
import { UNREADABLE, shrinkImage } from './shrink-image'

export type UploadResult =
  | { ok: true; path: string; name: string; type: string; size: number }
  | { ok: false; message: string }

const NOT_FINISHED = 'The upload did not finish. Check your connection and try again.'

/** Checks a file, shrinks photos, and uploads it straight to private storage. Runs in the browser. */
export async function uploadFile(file: File, target: UploadTarget, opts: { maxSide?: number } = {}): Promise<UploadResult> {
  try {
    const check = validateFile({ name: file.name, type: file.type, size: file.size })
    if (!check.ok) return check

    const toSend = check.kind === 'image' ? await shrinkImage(file, { maxSide: opts.maxSide }) : file
    if (toSend.size > MAX_FILE_BYTES) return { ok: false, message: 'This file is larger than 10 MB.' }

    const signed = await createSignedUpload(target, toSend.name)
    if (!signed.ok) return { ok: false, message: signed.message }

    const { error } = await createBrowserSupabase()
      .storage.from('files')
      .uploadToSignedUrl(signed.data.path, signed.data.token, toSend, {
        contentType: toSend.type || 'application/octet-stream',
      })
    if (error) return { ok: false, message: NOT_FINISHED }

    return { ok: true, path: signed.data.path, name: toSend.name, type: toSend.type, size: toSend.size }
  } catch (error) {
    return { ok: false, message: error instanceof Error && error.message === UNREADABLE ? UNREADABLE : NOT_FINISHED }
  }
}
