'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { runAction } from '@/lib/run-action'
import { reviseQuotation, setQuotationStatus } from '../actions'
import type { QuotationStatus } from '../labels'

/** The next steps a quotation can take: send, accept, reject (with an optional reason) or revise. */
export function QuotationActions({ id, status }: { id: string; status: QuotationStatus }) {
  const router = useRouter()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const mark = (next: 'sent' | 'accepted' | 'rejected') =>
    startTransition(async () => {
      const result = await runAction(() => setQuotationStatus(id, next, next === 'rejected' ? reason : undefined))
      setMessage(result.ok ? null : result.message)
      if (result.ok) setRejecting(false)
    })

  const revise = () =>
    startTransition(async () => {
      const result = await runAction(() => reviseQuotation(id))
      if (result.ok) router.push(`/quotes/${result.data.id}/edit`)
      else setMessage(result.message)
    })

  const canReject = status === 'draft' || status === 'sent'
  const canRevise = status === 'sent' || status === 'rejected'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === 'draft' && (
          <button type="button" disabled={pending} className="button-primary" onClick={() => mark('sent')}>
            Mark as sent
          </button>
        )}
        {status === 'sent' && (
          <button type="button" disabled={pending} className="button-primary" onClick={() => mark('accepted')}>
            Mark accepted
          </button>
        )}
        {canReject && !rejecting && (
          <button type="button" className="button-secondary" onClick={() => setRejecting(true)}>
            Mark rejected
          </button>
        )}
        {canRevise && (
          <button type="button" disabled={pending} className="button-secondary" onClick={revise}>
            Revise
          </button>
        )}
      </div>
      {rejecting && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Reason (optional)
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="field py-2" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} className="button-primary bg-oxide" onClick={() => mark('rejected')}>
              Confirm
            </button>
            <button type="button" className="button-secondary" onClick={() => setRejecting(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {message && <p className="text-sm text-oxide">{message}</p>}
    </div>
  )
}
