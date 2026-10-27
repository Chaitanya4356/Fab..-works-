'use client'

import { useState, useTransition } from 'react'
import { runAction } from '@/lib/run-action'
import { createQuotationShareLink } from '../share-actions'

/**
 * Hands the PDF to the phone's share sheet where it can send files; otherwise opens WhatsApp
 * with a link that works for 7 days (spec 4.6).
 */
export function ShareOnWhatsApp({ quotationId, fileName, text }: { quotationId: string; fileName: string; text: string }) {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const share = () =>
    startTransition(async () => {
      setMessage(null)
      try {
        const response = await fetch(`/api/pdf/quotation/${quotationId}`)
        if (!response.ok) throw new Error('pdf')
        const file = new File([await response.blob()], fileName, { type: 'application/pdf' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text })
          return
        }
      } catch (error) {
        // Closing the share sheet without choosing anyone is not a failure.
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Any other trouble falls through to the link, which does not need the file in the browser.
      }
      const result = await runAction(() => createQuotationShareLink(quotationId))
      if (result.ok) window.open(result.data.whatsappUrl, '_blank')
      else setMessage(result.message)
    })

  return (
    <div className="flex flex-col gap-2">
      <div>
        <button type="button" disabled={pending} className="button-secondary" onClick={share}>
          {pending ? 'Preparing…' : 'Share on WhatsApp'}
        </button>
      </div>
      {message && <p className="text-sm text-oxide">{message}</p>}
    </div>
  )
}
