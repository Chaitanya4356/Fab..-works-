'use client'

import { useState, useTransition } from 'react'
import { INDIA_STATES } from '@/lib/india-states'
import { runAction } from '@/lib/run-action'
import { updateSettings } from '../actions'

export type SettingsFormValues = {
  workshopName: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  bankName: string
  bankAccountName: string
  bankAccountNo: string
  bankIfsc: string
  upiId: string
  gstEnabled: boolean
  gstin: string
  defaultGstRate: string
  defaultMarginPercent: string
  quotationValidityDays: string
  invoiceDueDays: string
  quotationTerms: string
  invoiceTerms: string
}

type TextKey = Exclude<keyof SettingsFormValues, 'gstEnabled'>

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [values, setValues] = useState(initial)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null)
  const [pending, startTransition] = useTransition()

  const update = (key: TextKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await runAction(() => updateSettings(values))
      setFieldErrors(result.ok ? {} : (result.fieldErrors ?? {}))
      setMessage(result.ok ? { text: 'Saved', good: true } : { text: result.message, good: false })
    })
  }

  const error = (key: string) =>
    fieldErrors[key] && <span className="text-sm font-normal text-oxide">{fieldErrors[key]}</span>

  const text = (key: TextKey, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input {...props} value={values[key]} onChange={update(key)} aria-invalid={Boolean(fieldErrors[key])} className="field" />
      {error(key)}
    </label>
  )

  const area = (key: TextKey, label: string) => (
    <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
      {label}
      <textarea value={values[key]} onChange={update(key)} rows={3} className="field py-2" />
      {error(key)}
    </label>
  )

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Workshop</legend>
        {text('workshopName', 'Workshop name', { required: true })}
        {text('phone', 'Phone', { inputMode: 'tel' })}
        {text('address', 'Address')}
        {text('city', 'City')}
        <label className="flex flex-col gap-1 text-sm font-medium">
          State
          <select value={values.state} onChange={update('state')} className="field">
            <option value="">Choose a state</option>
            {INDIA_STATES.map((s) => (
              <option key={s.code} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          {error('state')}
        </label>
        {text('pincode', 'PIN code', { inputMode: 'numeric' })}
        {text('email', 'Email', { type: 'email' })}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Bank and UPI</legend>
        {text('bankName', 'Bank name')}
        {text('bankAccountName', 'Account name')}
        {text('bankAccountNo', 'Account number', { inputMode: 'numeric' })}
        {text('bankIfsc', 'IFSC code')}
        {text('upiId', 'UPI ID')}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">GST</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium sm:col-span-2">
          <input
            type="checkbox"
            checked={values.gstEnabled}
            onChange={(e) => setValues((v) => ({ ...v, gstEnabled: e.target.checked }))}
            className="h-5 w-5"
          />
          Charge GST on invoices
        </label>
        {fieldErrors.gstEnabled && <p className="text-sm text-oxide sm:col-span-2">{fieldErrors.gstEnabled}</p>}
        {text('gstin', 'GSTIN')}
        {text('defaultGstRate', 'Default GST rate (%)', { inputMode: 'decimal' })}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Defaults</legend>
        {text('defaultMarginPercent', 'Default margin (%)', { inputMode: 'decimal' })}
        {text('quotationValidityDays', 'Quotations valid for (days)', { inputMode: 'numeric' })}
        {text('invoiceDueDays', 'Invoices due after (days)', { inputMode: 'numeric' })}
        {area('quotationTerms', 'Quotation terms')}
        {area('invoiceTerms', 'Invoice terms')}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="button-primary">
          {pending ? 'Saving…' : 'Save settings'}
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
