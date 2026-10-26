'use client'

import { useState, useTransition } from 'react'
import {
  DOC_TYPES,
  DOC_TYPE_LABELS,
  formatDocNumber,
  gstInvoiceLengthMessage,
  type DocNumberFormat,
  type DocType,
} from '@/lib/doc-number'
import { financialYear } from '@/lib/fy'
import { runAction } from '@/lib/run-action'
import { saveDocNumberFormats } from '../actions'
import type { DocNumberFormatRow } from '../queries'

type Draft = { prefix: string; separator: string; yearStyle: string; digits: string; nextNumber: string }

const toDraft = (f: DocNumberFormatRow): Draft => ({
  prefix: f.prefix,
  separator: f.separator,
  yearStyle: f.yearStyle,
  digits: String(f.digits),
  nextNumber: String(f.nextNumber),
})

/** The draft as a format, when it is complete enough to preview. */
function previewable(d: Draft): (DocNumberFormat & { nextNumber: number }) | null {
  const digits = Number(d.digits)
  const nextNumber = Number(d.nextNumber)
  const prefix = d.prefix.trim().toUpperCase()
  if (!prefix || !Number.isInteger(digits) || digits < 1 || digits > 8 || !Number.isInteger(nextNumber) || nextNumber < 1) {
    return null
  }
  return {
    prefix,
    separator: d.separator as DocNumberFormat['separator'],
    yearStyle: d.yearStyle as DocNumberFormat['yearStyle'],
    digits,
    nextNumber,
  }
}

export function DocNumberFormats({
  initial,
  today,
  gstEnabled,
}: {
  initial: Record<DocType, DocNumberFormatRow>
  today: string
  gstEnabled: boolean
}) {
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(DOC_TYPES.map((t) => [t, toDraft(initial[t])])) as Record<DocType, Draft>,
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null)
  const [pending, startTransition] = useTransition()
  const fy = financialYear(today)

  const set = (type: DocType, key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDrafts((d) => ({ ...d, [type]: { ...d[type], [key]: e.target.value } }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const loaded = Object.fromEntries(
        DOC_TYPES.map((t) => [t, { nextNumber: initial[t].nextNumber, yearStyle: initial[t].yearStyle }]),
      )
      const result = await runAction(() => saveDocNumberFormats({ formats: drafts, loaded }))
      setFieldErrors(result.ok ? {} : (result.fieldErrors ?? {}))
      setMessage(result.ok ? { text: 'Numbering saved', good: true } : { text: result.message, good: false })
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Changes apply to the next number given out. Existing documents keep their numbers.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {DOC_TYPES.map((type) => {
          const draft = drafts[type]
          const format = previewable(draft)
          const gstMessage = type === 'invoice' && format ? gstInvoiceLengthMessage(format, today, format.nextNumber) : null
          const error = (key: string) =>
            fieldErrors[`${type}.${key}`] && (
              <span className="text-sm font-normal text-oxide">{fieldErrors[`${type}.${key}`]}</span>
            )
          return (
            <fieldset key={type} className="grid grid-cols-2 gap-3 rounded border border-line bg-surface p-4">
              <legend className="px-1 font-semibold">{DOC_TYPE_LABELS[type]} numbers</legend>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Prefix
                <input value={draft.prefix} onChange={set(type, 'prefix')} className="field uppercase" />
                {error('prefix')}
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Separator
                <select value={draft.separator} onChange={set(type, 'separator')} className="field">
                  <option value="/">/</option>
                  <option value="-">-</option>
                  <option value="">None</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Year
                <select value={draft.yearStyle} onChange={set(type, 'yearStyle')} className="field">
                  <option value="full">{fy}</option>
                  <option value="short">{fy.slice(2)}</option>
                  <option value="none">No year</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Digits
                <input type="number" min={1} max={8} value={draft.digits} onChange={set(type, 'digits')} className="field" />
                {error('digits')}
              </label>
              <label className="col-span-2 flex flex-col gap-1 text-sm font-medium">
                Next number
                <input type="number" min={1} value={draft.nextNumber} onChange={set(type, 'nextNumber')} className="field" />
                {error('nextNumber')}
              </label>
              <p className="col-span-2 font-mono text-sm">Next: {format ? formatDocNumber(format, today, format.nextNumber) : '—'}</p>
              {gstMessage && !fieldErrors['invoice.prefix'] && (
                <p className={gstEnabled ? 'col-span-2 text-sm text-oxide' : 'col-span-2 text-sm text-muted'}>{gstMessage}</p>
              )}
            </fieldset>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="button-primary">
          {pending ? 'Saving…' : 'Save numbering'}
        </button>
        {message && (
          <p role="status" className={message.good ? 'text-sm text-ok' : 'text-sm text-oxide'}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  )
}
