'use client'

import { useState, useTransition } from 'react'
import { runAction } from '@/lib/run-action'
import { createUser } from '../actions'

const EMPTY = { fullName: '', phone: '', email: '', password: '' }

export function AddUserForm() {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(EMPTY)
  const [message, setMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await runAction(() => createUser(values))
      if (result.ok) {
        setValues(EMPTY)
        setMessage(null)
        setFieldErrors({})
        setOpen(false)
      } else {
        setMessage(result.message)
        setFieldErrors(result.fieldErrors ?? {})
      }
    })
  }

  if (!open) {
    return (
      <div>
        <button type="button" className="button-primary" onClick={() => setOpen(true)}>
          Add user
        </button>
      </div>
    )
  }

  const field = (key: keyof typeof EMPTY, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input {...props} value={values[key]} onChange={set(key)} className="field" aria-invalid={Boolean(fieldErrors[key])} />
      {fieldErrors[key] && <span className="text-sm font-normal text-oxide">{fieldErrors[key]}</span>}
    </label>
  )

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded border border-line bg-surface p-4">
      <h2 className="text-lg font-semibold">New user</h2>
      {message && (
        <p role="alert" className="text-sm text-oxide">
          {message}
        </p>
      )}
      {field('fullName', 'Full name', { autoComplete: 'off', required: true })}
      {field('phone', 'Mobile', { inputMode: 'tel', autoComplete: 'off' })}
      {field('email', 'Login email', { type: 'email', autoComplete: 'off', required: true })}
      {field('password', 'Password', { type: 'text', autoComplete: 'new-password', required: true })}
      <p className="text-sm text-muted">Share the password with them in person.</p>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="button-primary">
          {pending ? 'Saving…' : 'Save user'}
        </button>
        <button type="button" className="button-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  )
}
