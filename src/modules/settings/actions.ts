'use server'

import { revalidatePath } from 'next/cache'
import { activeUserForAction } from '@/lib/auth'
import { fail, ok, zodFieldErrors, type ActionResult } from '@/lib/action-result'
import { todayIST } from '@/lib/dates'
import { dbMessage } from '@/lib/db-errors'
import { DOC_TYPES, gstInvoiceLengthMessage, makeDocNumberFormatsSchema, type DocType } from '@/lib/doc-number'
import { MESSAGES } from '@/lib/messages'
import { getDocNumberFormats } from './queries'
import { settingsSchema, toSettingsRow } from './schema'

export async function updateSettings(input: unknown): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))

  if (parsed.data.gstEnabled) {
    // GST invoice numbers may have at most 16 characters (spec 7.11), so check the saved invoice format first.
    const today = todayIST()
    const invoice = (await getDocNumberFormats(today)).invoice
    const tooLong = gstInvoiceLengthMessage(invoice, today, invoice.nextNumber)
    if (tooLong) {
      return fail(MESSAGES.checkFields, { gstEnabled: `${tooLong} Shorten the invoice number format first.` })
    }
  }

  const { data, error } = await auth.data.supabase
    .from('settings')
    .update(toSettingsRow(parsed.data))
    .eq('id', 1)
    .select('id')
  if (error) return fail(dbMessage(error))
  if (!data.length) return fail(MESSAGES.unexpected)
  revalidatePath('/settings')
  return ok(null)
}

async function replaceLogo(path: string | null): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  const { supabase } = auth.data

  const { data: current, error: readError } = await supabase.from('settings').select('logo_path').eq('id', 1).single()
  if (readError) return fail(dbMessage(readError))

  const { error } = await supabase.from('settings').update({ logo_path: path }).eq('id', 1)
  if (error) return fail(dbMessage(error))

  if (current.logo_path && current.logo_path !== path) {
    const { error: removeError } = await supabase.storage.from('files').remove([current.logo_path])
    if (removeError) console.error('could not remove the old logo', removeError)
  }
  revalidatePath('/settings')
  return ok(null)
}

export async function setLogo(path: string): Promise<ActionResult> {
  if (typeof path !== 'string' || !path.startsWith('settings/logo/')) return fail(MESSAGES.unexpected)
  return replaceLogo(path)
}

export async function removeLogo(): Promise<ActionResult> {
  return replaceLogo(null)
}

/**
 * Saves every document number format. A next number is sent only for types where the user changed it (or its
 * year style), so numbers taken by someone else in the meantime are not mistaken for a change.
 */
export async function saveDocNumberFormats(input: unknown): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  const { supabase } = auth.data
  const { formats, loaded } = (input ?? {}) as {
    formats?: unknown
    loaded?: Partial<Record<DocType, { nextNumber: number; yearStyle: string }>>
  }

  const { data: settings, error: settingsError } = await supabase.from('settings').select('gst_enabled').eq('id', 1).single()
  if (settingsError) return fail(dbMessage(settingsError))

  const today = todayIST()
  const parsed = makeDocNumberFormatsSchema({ gstEnabled: settings.gst_enabled, today }).safeParse(formats)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))

  const payload = DOC_TYPES.map((type) => {
    const f = parsed.data[type]
    // A new year style moves numbering to another series, so the number shown on screen is sent for it too.
    const changed = loaded?.[type]?.nextNumber !== f.nextNumber || loaded?.[type]?.yearStyle !== f.yearStyle
    return {
      doc_type: type,
      prefix: f.prefix,
      separator: f.separator,
      year_style: f.yearStyle,
      digits: f.digits,
      ...(changed ? { next_number: f.nextNumber } : {}),
    }
  })

  const { error } = await supabase.rpc('save_doc_number_formats', { p_formats: payload, p_as_of: today })
  if (error) return fail(dbMessage(error))
  revalidatePath('/settings')
  return ok(null)
}
