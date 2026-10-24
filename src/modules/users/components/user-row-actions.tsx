'use client'

import { useState, useTransition } from 'react'
import { resetUserPassword, setUserActive } from '../actions'
import type { UserRow } from '../queries'

export function UserRowActions({ user }: { user: UserRow }) {
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const switchTo = (active: boolean) =>
    startTransition(async () => {
      const result = await setUserActive({ userId: user.id, active })
      setConfirming(false)
      setMessage(result.ok ? null : result.message)
    })

  const savePassword = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await resetUserPassword({ userId: user.id, password })
      if (result.ok) {
        setResetting(false)
        setPassword('')
        setMessage(`Password changed. Tell ${user.fullName} the new one in person.`)
      } else {
        setMessage(result.fieldErrors?.password ?? result.message)
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {!user.isYou && user.isActive && !confirming && (
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
        {!user.isActive && (
          <button type="button" disabled={pending} className="button-secondary" onClick={() => switchTo(true)}>
            Switch on
          </button>
        )}
        {!resetting && (
          <button type="button" className="button-secondary" onClick={() => setResetting(true)}>
            Reset password
          </button>
        )}
      </div>
      {resetting && (
        <form onSubmit={savePassword} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            New password
            <input
              type="text"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="field"
            />
          </label>
          <button type="submit" disabled={pending} className="button-primary">
            Save password
          </button>
          <button type="button" className="button-secondary" onClick={() => setResetting(false)}>
            Cancel
          </button>
        </form>
      )}
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  )
}
