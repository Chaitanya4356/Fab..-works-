'use client'

import { useState, useTransition } from 'react'
import { FormMessage } from '@/components/text-field'
import { runAction } from '@/lib/run-action'
import { setFollowUpDate } from '../actions'

/** When to chase the customer next; due follow-ups show on the Quotes list. */
export function FollowUpForm({ id, initial }: { id: string; initial: string }) {
  const [date, setDate] = useState(initial)
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await runAction(() => setFollowUpDate(id, date))
      setMessage(result.ok ? { text: 'Saved', good: true } : { text: result.fieldErrors?.date ?? result.message, good: false })
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Follow up on
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
      </label>
      <button type="submit" disabled={pending} className="button-secondary">
        Save follow-up date
      </button>
      <FormMessage message={message} />
    </form>
  )
}
