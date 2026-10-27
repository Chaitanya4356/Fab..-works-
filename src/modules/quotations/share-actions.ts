'use server'

import { z } from 'zod'
import { activeUserForAction } from '@/lib/auth'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { MESSAGES } from '@/lib/messages'
import { whatsappUrl } from '@/lib/whatsapp'
import { storeSharedFile } from '@/modules/files/share'
import { getSettings } from '@/modules/settings/queries'
import { buildQuotationPdf } from './pdf'
import { quotationShareText } from './pdf-model'
import { getQuotation } from './queries'

/**
 * For phones that cannot hand a file to WhatsApp: keeps a copy of the PDF for 7 days and returns a chat link
 * whose message carries the download link (spec 4.6). The customer's mobile comes from their record.
 */
export async function createQuotationShareLink(id: string): Promise<ActionResult<{ whatsappUrl: string }>> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  if (!z.guid().safeParse(id).success) return fail(MESSAGES.unexpected)

  try {
    const quotation = await getQuotation(id)
    const pdf = await buildQuotationPdf(id)
    if (!quotation || !pdf) return fail(MESSAGES.unexpected)
    const settings = await getSettings()
    const link = await storeSharedFile(
      auth.data.supabase,
      { entityType: 'quotation', entityId: quotation.id },
      pdf.fileName,
      pdf.buffer,
      'application/pdf',
    )
    const text = quotationShareText({
      workshopName: settings.workshop_name,
      label: pdf.label,
      title: quotation.title,
      grandTotal: quotation.grand_total,
    })
    return ok({ whatsappUrl: whatsappUrl(quotation.customer.phone, `${text}\n${link}`) })
  } catch (error) {
    console.error('could not create a share link', error)
    return fail(MESSAGES.unexpected)
  }
}
