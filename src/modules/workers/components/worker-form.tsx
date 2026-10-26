'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FormMessage, TextField } from '@/components/text-field'
import { runAction } from '@/lib/run-action'
import { createWorker, updateWorker } from '../actions'
import type { WorkerFormValues } from '../form-values'
import { PAY_TYPES, PAY_TYPE_LABELS, TRADES, TRADE_LABELS } from '../labels'

export function WorkerForm({ initial, workerId }: { initial: WorkerFormValues; workerId?: string }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null)
  const [pending, startTransition] = useTransition()

  const bind = (key: keyof WorkerFormValues) => ({
    value: values[key],
    error: fieldErrors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await runAction(() => (workerId ? updateWorker(workerId, values) : createWorker(values)))
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {})
        setMessage({ text: result.message, good: false })
        return
      }
      router.push(`/workers/${workerId ?? (result.data as { id: string }).id}`)
    })
  }

  const choice = (key: 'trade' | 'payType', label: string, blank: string, options: [string, string][]) => {
    const field = bind(key)
    return (
      <label className="flex flex-col gap-1 text-sm font-medium">
        {label}
        <select value={field.value} onChange={field.onChange} aria-invalid={Boolean(field.error)} className="field">
          <option value="">{blank}</option>
          {options.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
        {field.error && <span className="text-sm font-normal text-oxide">{field.error}</span>}
      </label>
    )
  }

  const notes = bind('notes')

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" required {...bind('fullName')} />
        {choice('trade', 'Trade', 'Choose a trade', TRADES.map((t) => [t, TRADE_LABELS[t]]))}
        <TextField label="Mobile" inputMode="tel" {...bind('phone')} />
        <TextField label="Other phone" inputMode="tel" {...bind('altPhone')} />
        <TextField label="Address" {...bind('address')} />
        <TextField label="Joining date" type="date" {...bind('joiningDate')} />
        <TextField label="Skills" {...bind('skills')} />
        <TextField label="Experience (years)" inputMode="decimal" {...bind('experienceYears')} />
        {choice('payType', 'Pay type', 'Not set', PAY_TYPES.map((p) => [p, PAY_TYPE_LABELS[p]]))}
        <TextField label="Pay rate (₹)" inputMode="decimal" {...bind('payRate')} />
        <TextField label="Emergency contact name" {...bind('emergencyContactName')} />
        <TextField label="Emergency contact mobile" inputMode="tel" {...bind('emergencyContactPhone')} />
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Notes
          <textarea value={notes.value} onChange={notes.onChange} rows={3} className="field py-2" />
          {notes.error && <span className="text-sm font-normal text-oxide">{notes.error}</span>}
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="button-primary">
          {pending ? 'Saving…' : 'Save worker'}
        </button>
        <FormMessage message={message} />
      </div>
    </form>
  )
}
