'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { FormMessage, TextField } from '@/components/text-field'
import { runAction } from '@/lib/run-action'
import { workerOptionLabel, type WorkerOption } from '../labels'
import { addToTeam } from '../team-actions'

export function AddToTeamForm({ projectId, options, today }: { projectId: string; options: WorkerOption[]; today: string }) {
  const empty = { workerId: '', role: '', fromDate: today }
  const [values, setValues] = useState(empty)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null)
  const [pending, startTransition] = useTransition()

  if (options.length === 0) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 text-muted">
        No more active workers to add.
        <Link href="/workers/new" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Add a worker
        </Link>
      </p>
    )
  }

  const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await runAction(() => addToTeam(projectId, values))
      if (result.ok) {
        setValues(empty)
        setFieldErrors({})
        setMessage(null)
      } else {
        setFieldErrors(result.fieldErrors ?? {})
        setMessage({ text: result.message, good: false })
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-3">
          Worker
          <select value={values.workerId} onChange={set('workerId')} aria-invalid={Boolean(fieldErrors.workerId)} className="field">
            <option value="">Choose a worker</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {workerOptionLabel(o)}
              </option>
            ))}
          </select>
          {fieldErrors.workerId && <span className="text-sm font-normal text-oxide">{fieldErrors.workerId}</span>}
        </label>
        <TextField label="Role" placeholder="e.g. Lead welder" value={values.role} error={fieldErrors.role} onChange={set('role')} />
        <TextField label="From" type="date" value={values.fromDate} error={fieldErrors.fromDate} onChange={set('fromDate')} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="button-primary">
          {pending ? 'Adding…' : 'Add to team'}
        </button>
        <FormMessage message={message} />
      </div>
    </form>
  )
}
