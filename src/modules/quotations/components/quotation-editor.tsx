'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FormMessage, TextField } from '@/components/text-field'
import { runAction } from '@/lib/run-action'
import { saveQuotation } from '../actions'
import type { QuotationFormValues } from '../form-values'
import { CATEGORY_LABELS, COST_CATEGORIES } from '../labels'
import { generateItems, quotationTotals, type CostLineDraft, type ItemDraft } from '../maths'
import { TotalsBlock } from './totals-block'

type HeaderKey = Exclude<keyof QuotationFormValues, 'costLines' | 'items'>

const EMPTY_LINE: CostLineDraft = { category: 'material', description: '', qty: '', unit: '', costRate: '' }
const EMPTY_ITEM: ItemDraft = { description: '', hsnSac: '', qty: '', unit: '', rate: '' }

export function QuotationEditor({
  quotationId,
  initial,
  customers,
  gstRate,
}: {
  quotationId?: string
  initial: QuotationFormValues
  customers: { id: string; name: string }[]
  gstRate: string | null
}) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null)
  const [pending, startTransition] = useTransition()

  const header = (key: HeaderKey) => ({
    value: values[key],
    error: fieldErrors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
  })

  // Adding or removing a line renumbers the lines, so earlier field errors no longer point at the right one.
  const setLines = (update: (v: QuotationFormValues) => Partial<QuotationFormValues>) => {
    setValues((v) => ({ ...v, ...update(v) }))
    setFieldErrors({})
  }
  const changeLine = (index: number, key: keyof CostLineDraft, value: string) =>
    setValues((v) => ({ ...v, costLines: v.costLines.map((l, i) => (i === index ? { ...l, [key]: value } : l)) }))
  const changeItem = (index: number, key: keyof ItemDraft, value: string) =>
    setValues((v) => ({ ...v, items: v.items.map((it, i) => (i === index ? { ...it, [key]: value } : it)) }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await runAction(() => saveQuotation(quotationId ?? null, values))
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {})
        setMessage({ text: result.message, good: false })
        return
      }
      router.push(`/quotes/${result.data.id}`)
    })
  }

  const textArea = (key: HeaderKey, label: string) => {
    const field = header(key)
    return (
      <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
        {label}
        <textarea value={field.value} onChange={field.onChange} rows={3} className="field py-2" />
        {field.error && <span className="text-sm font-normal text-oxide">{field.error}</span>}
      </label>
    )
  }

  const customer = header('customerId')
  const totals = quotationTotals({ costLines: values.costLines, items: values.items, gstRate })

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Customer
          <select value={customer.value} onChange={customer.onChange} aria-invalid={Boolean(customer.error)} className="field">
            <option value="">Choose a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {customer.error && <span className="text-sm font-normal text-oxide">{customer.error}</span>}
        </label>
        <TextField label="Title" required {...header('title')} />
        <TextField label="Site address" {...header('siteAddress')} />
        <TextField label="Margin (%)" inputMode="decimal" {...header('marginPercent')} />
        <TextField label="Enquiry date" type="date" {...header('enquiryDate')} />
        <TextField label="Quotation date" type="date" required {...header('quoteDate')} />
        <TextField label="Valid until" type="date" {...header('validUntil')} />
        <TextField label="Follow up on" type="date" {...header('followUpDate')} />
        {textArea('scope', 'Scope of work')}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Cost sheet (not shown to the customer)</h2>
        {values.costLines.map((line, i) => (
          <fieldset key={i} aria-label={`Cost line ${i + 1}`} className="grid gap-3 rounded border border-line bg-surface p-3 sm:grid-cols-6">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Category
              <select value={line.category} onChange={(e) => changeLine(i, 'category', e.target.value)} className="field">
                {COST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <TextField
              label="Description"
              className="sm:col-span-2"
              value={line.description}
              error={fieldErrors[`costLines.${i}.description`]}
              onChange={(e) => changeLine(i, 'description', e.target.value)}
            />
            <TextField label="Qty" inputMode="decimal" value={line.qty} error={fieldErrors[`costLines.${i}.qty`]} onChange={(e) => changeLine(i, 'qty', e.target.value)} />
            <TextField label="Unit" value={line.unit} error={fieldErrors[`costLines.${i}.unit`]} onChange={(e) => changeLine(i, 'unit', e.target.value)} />
            <TextField
              label="Cost rate (₹)"
              inputMode="decimal"
              value={line.costRate}
              error={fieldErrors[`costLines.${i}.costRate`]}
              onChange={(e) => changeLine(i, 'costRate', e.target.value)}
            />
            <div className="sm:col-span-6">
              <button type="button" className="button-secondary" onClick={() => setLines((v) => ({ costLines: v.costLines.filter((_, n) => n !== i) }))}>
                Remove
              </button>
            </div>
          </fieldset>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button-secondary" onClick={() => setLines((v) => ({ costLines: [...v.costLines, EMPTY_LINE] }))}>
            Add cost line
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setLines((v) => ({ items: generateItems(v.costLines, v.marginPercent, 'lump_sum') }))}
          >
            Price as one lump sum
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setLines((v) => ({ items: generateItems(v.costLines, v.marginPercent, 'itemised') }))}
          >
            Price line by line
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Items (shown to the customer)</h2>
        {values.items.map((item, i) => (
          <fieldset key={i} aria-label={`Item ${i + 1}`} className="grid gap-3 rounded border border-line bg-surface p-3 sm:grid-cols-6">
            <TextField
              label="Description"
              className="sm:col-span-2"
              value={item.description}
              error={fieldErrors[`items.${i}.description`]}
              onChange={(e) => changeItem(i, 'description', e.target.value)}
            />
            <TextField label="HSN/SAC" inputMode="numeric" value={item.hsnSac} error={fieldErrors[`items.${i}.hsnSac`]} onChange={(e) => changeItem(i, 'hsnSac', e.target.value)} />
            <TextField label="Qty" inputMode="decimal" value={item.qty} error={fieldErrors[`items.${i}.qty`]} onChange={(e) => changeItem(i, 'qty', e.target.value)} />
            <TextField label="Unit" value={item.unit} error={fieldErrors[`items.${i}.unit`]} onChange={(e) => changeItem(i, 'unit', e.target.value)} />
            <TextField
              label="Rate (₹)"
              inputMode="decimal"
              value={item.rate}
              error={fieldErrors[`items.${i}.rate`]}
              onChange={(e) => changeItem(i, 'rate', e.target.value)}
            />
            <div className="sm:col-span-6">
              <button type="button" className="button-secondary" onClick={() => setLines((v) => ({ items: v.items.filter((_, n) => n !== i) }))}>
                Remove
              </button>
            </div>
          </fieldset>
        ))}
        <div>
          <button type="button" className="button-secondary" onClick={() => setLines((v) => ({ items: [...v.items, EMPTY_ITEM] }))}>
            Add item
          </button>
        </div>
      </section>

      <TotalsBlock totals={totals} gstRate={gstRate} showCost />

      {textArea('terms', 'Terms')}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="button-primary">
          {pending ? 'Saving…' : 'Save quotation'}
        </button>
        <FormMessage message={message} />
      </div>
    </form>
  )
}
