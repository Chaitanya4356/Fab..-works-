'use client'

import { useState, useTransition } from 'react'
import { runAction } from '@/lib/run-action'
import { createQuotationShareLink } from '../share-actions'

/**
 * Hands the PDF to the phone's share sheet where it can send files; otherwise prepares a WhatsApp link that works
 * for 7 days (spec 4.6). Browsers only open a new window straight after a tap, and preparing the PDF takes longer
 * than that, so the link is also shown to tap: a second tap is a fresh gesture the browser always allows.
 */
export function ShareOnWhatsApp({ quotationId, fileName, text }: { quotationId: string; fileName: string; text: string }) {
  const [message, setMessage] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const share = () =>
    startTransition(async () => {
      setMessage(null)
      setLink(null)
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
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      setLink(result.data.whatsappUrl)
      window.open(result.data.whatsappUrl, '_blank')
    })

  return (
    <div className="flex flex-col gap-2">
      <div>
        <button type="button" disabled={pending} className="button-secondary" onClick={share}>
          {pending ? 'Preparing…' : 'Share on WhatsApp'}
        </button>
      </div>
      {link && (
        <p className="text-sm">
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">
            Open WhatsApp
          </a>{' '}
          <span className="text-muted">if it did not open by itself. The link works for 7 days.</span>
        </p>
      )}
      {message && <p className="text-sm text-oxide">{message}</p>}
    </div>
  )
}
