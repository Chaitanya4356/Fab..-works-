'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FormMessage, TextField } from '@/components/text-field'
import { INDIA_STATES } from '@/lib/india-states'
import { runAction } from '@/lib/run-action'
import { createCustomer, updateCustomer } from '../actions'
import type { CustomerFormValues } from '../form-values'

export function CustomerForm({
  initial,
  customerId,
  then,
}: {
  initial: CustomerFormValues
  customerId?: string
  then?: 'project'
}) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null)
  const [pending, startTransition] = useTransition()

  const bind = (key: keyof CustomerFormValues) => ({
    value: values[key],
    error: fieldErrors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await runAction(() => (customerId ? updateCustomer(customerId, values) : createCustomer(values)))
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {})
        setMessage({ text: result.message, good: false })
        return
      }
      const id = customerId ?? (result.data as { id: string }).id
      router.push(then === 'project' ? `/projects/new?customer=${id}` : `/customers/${id}`)
    })
  }

  const state = bind('state')
  const notes = bind('notes')

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Company name" required {...bind('name')} />
        <TextField label="Contact person" {...bind('contactPerson')} />
        <TextField label="Mobile" inputMode="tel" {...bind('phone')} />
        <TextField label="Other phone" inputMode="tel" {...bind('altPhone')} />
        <TextField label="Email" type="email" {...bind('email')} />
        <TextField label="Address" {...bind('address')} />
        <TextField label="City" {...bind('city')} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          State
          <select value={state.value} onChange={state.onChange} className="field">
            <option value="">Choose a state</option>
            {INDIA_STATES.map((s) => (
              <option key={s.code} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          {state.error && <span className="text-sm font-normal text-oxide">{state.error}</span>}
        </label>
        <TextField label="PIN code" inputMode="numeric" {...bind('pincode')} />
        <TextField label="GSTIN" className="uppercase" {...bind('gstin')} />
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Notes
          <textarea value={notes.value} onChange={notes.onChange} rows={3} className="field py-2" />
          {notes.error && <span className="text-sm font-normal text-oxide">{notes.error}</span>}
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="button-primary">
          {pending ? 'Saving…' : 'Save customer'}
        </button>
        <FormMessage message={message} />
      </div>
    </form>
  )
}
