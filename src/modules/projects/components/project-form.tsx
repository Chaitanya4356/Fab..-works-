'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FormMessage, TextField } from '@/components/text-field'
import { createProject, updateProject } from '../actions'
import type { ProjectFormValues } from '../form-values'
import { ESTIMATE_FIELDS, PROJECT_STATUSES, STATUS_LABELS } from '../labels'

export function ProjectForm({
  initial,
  customers,
  projectId,
}: {
  initial: ProjectFormValues
  customers: { id: string; label: string }[]
  projectId?: string
}) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null)
  const [pending, startTransition] = useTransition()

  const set = (key: keyof ProjectFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }))
  const bind = (key: keyof ProjectFormValues) => ({ value: values[key], error: fieldErrors[key], onChange: set(key) })
  const errorFor = (key: string) =>
    fieldErrors[key] && <span className="text-sm font-normal text-oxide">{fieldErrors[key]}</span>

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = projectId ? await updateProject(projectId, values) : await createProject(values)
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {})
        setMessage({ text: result.message, good: false })
        return
      }
      router.push(`/projects/${projectId ?? (result.data as { id: string }).id}`)
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Customer
          <select value={values.customerId} onChange={set('customerId')} required className="field">
            <option value="">Choose a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {errorFor('customerId')}
          {!projectId && (
            <Link href="/customers/new?then=project" className="font-normal text-muted underline underline-offset-4">
              Add a new customer
            </Link>
          )}
        </label>
        <TextField label="Title" required {...bind('title')} />
        <TextField label="Site address" {...bind('siteAddress')} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Status
          <select value={values.status} onChange={set('status')} className="field">
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {errorFor('status')}
        </label>
        <TextField label="Start date" type="date" {...bind('startDate')} />
        <TextField label="Due date" type="date" {...bind('dueDate')} />
        {values.status === 'completed' && <TextField label="Completed on" type="date" {...bind('completedDate')} />}
        <TextField label="Contract value (₹)" inputMode="decimal" {...bind('contractValue')} />
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Description
          <textarea value={values.description} onChange={set('description')} rows={3} className="field py-2" />
          {errorFor('description')}
        </label>
      </div>

      <fieldset className="grid gap-4 rounded border border-line bg-surface p-4 sm:grid-cols-3">
        <legend className="px-1 font-semibold">Estimated cost</legend>
        {ESTIMATE_FIELDS.map((f) => (
          <TextField key={f.key} label={`${f.label} (₹)`} inputMode="decimal" {...bind(f.key)} />
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Notes
        <textarea value={values.notes} onChange={set('notes')} rows={3} className="field py-2" />
        {errorFor('notes')}
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="button-primary">
          {pending ? 'Saving…' : projectId ? 'Save project' : 'Create project'}
        </button>
        <FormMessage message={message} />
      </div>
    </form>
  )
}
