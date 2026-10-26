import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate, formatINR } from '@/lib/format'
import { paiseToRupees } from '@/lib/money'
import { QuotationStatusPill } from '@/modules/quotations/components/status-pill'
import { TotalsBlock } from '@/modules/quotations/components/totals-block'
import { CATEGORY_LABELS } from '@/modules/quotations/labels'
import { storedTotals } from '@/modules/quotations/maths'
import { getQuotation } from '@/modules/quotations/queries'

const qtyText = (qty: number) => qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })

export default async function QuotationPage({ params }: PageProps<'/quotes/[id]'>) {
  const { id } = await params
  const quotation = await getQuotation(id)
  if (!quotation) notFound()
  const totals = storedTotals(quotation)
  const gstRate = quotation.gst_rate === null ? null : String(quotation.gst_rate)

  const details: [string, React.ReactNode][] = [
    ['Quotation date', quotation.quote_date && formatDate(quotation.quote_date)],
    ['Valid until', quotation.valid_until && formatDate(quotation.valid_until)],
    ['Enquiry date', quotation.enquiry_date && formatDate(quotation.enquiry_date)],
    ['Follow up on', quotation.follow_up_date && formatDate(quotation.follow_up_date)],
    ['Site', quotation.site_address],
    ['Scope of work', quotation.scope],
  ]

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm text-muted">{quotation.label}</p>
        <h1 className="text-2xl font-semibold">{quotation.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href={`/customers/${quotation.customer.id}`} className="inline-flex min-h-11 items-center underline underline-offset-4">
            {quotation.customer.name}
          </Link>
          <QuotationStatusPill status={quotation.status} />
        </div>
        {quotation.status === 'draft' && (
          <div>
            <Link href={`/quotes/${quotation.id}/edit`} className="button-secondary">
              Edit
            </Link>
          </div>
        )}
      </div>

      <dl className="grid gap-x-6 gap-y-3 rounded border border-line bg-surface p-4 sm:grid-cols-2">
        {details
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
              <dd className="whitespace-pre-line">{value}</dd>
            </div>
          ))}
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Items</h2>
        {quotation.items.length === 0 ? (
          <p className="text-muted">No items yet.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-ground text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">HSN/SAC</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 text-right font-medium">Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item) => (
                  <tr key={item.id} className="border-t border-line align-top">
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2">{item.hsnSac}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{qtyText(item.qty)}</td>
                    <td className="px-3 py-2">{item.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(item.rate)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TotalsBlock totals={totals} gstRate={gstRate} showCost={false} />

      {quotation.terms && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Terms</h2>
          <p className="whitespace-pre-line">{quotation.terms}</p>
        </section>
      )}

      <section aria-label="Cost sheet" className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Cost sheet (not shown to the customer)</h2>
        {quotation.costLines.length > 0 && (
          <div className="overflow-x-auto rounded border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-ground text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Cost rate</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quotation.costLines.map((line) => (
                  <tr key={line.id} className="border-t border-line align-top">
                    <td className="px-3 py-2">{CATEGORY_LABELS[line.category]}</td>
                    <td className="px-3 py-2">{line.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {qtyText(line.qty)} {line.unit}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(line.costRate)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col gap-1 text-sm">
          <p>
            <span>Cost</span> <span className="tabular-nums">{formatINR(quotation.cost_total)}</span>
          </p>
          <p>
            <span>Margin</span> <span className="tabular-nums">{Number(quotation.margin_percent)}%</span>
          </p>
          <p>
            <span>Profit</span>{' '}
            <span className="tabular-nums">
              {formatINR(paiseToRupees(totals.profit))} ({totals.profitPercent}% of price)
            </span>
          </p>
        </div>
      </section>
    </section>
  )
}
