'use client'

import { useState, useTransition } from 'react'
import { setCustomerActive } from '../actions'

export function CustomerActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const switchTo = (active: boolean) =>
    startTransition(async () => {
      const result = await setCustomerActive(id, active)
      setConfirming(false)
      setMessage(result.ok ? null : result.message)
    })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {isActive && !confirming && (
          <button type="button" className="button-secondary" onClick={() => setConfirming(true)}>
            Switch off
          </button>
        )}
        {confirming && (
          <>
            <button type="button" disabled={pending} className="button-primary bg-oxide" onClick={() => switchTo(false)}>
              Yes, switch off
            </button>
            <button type="button" className="button-secondary" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        )}
        {!isActive && (
          <button type="button" disabled={pending} className="button-secondary" onClick={() => switchTo(true)}>
            Switch on
          </button>
        )}
      </div>
      {message && <p className="text-sm text-oxide">{message}</p>}
    </div>
  )
}
