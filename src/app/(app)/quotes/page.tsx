import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Pager } from '@/components/pager'
import { SearchBox } from '@/components/search-box'
import { formatINR } from '@/lib/format'
import { lastPage, pageFromParam } from '@/lib/paging'
import { FollowUpPill, QuotationStatusPill } from '@/modules/quotations/components/status-pill'
import { listQuotations, type QuoteView } from '@/modules/quotations/queries'

const VIEWS: { value: QuoteView; label: string; empty: string }[] = [
  { value: 'open', label: 'Open', empty: 'No open quotations.' },
  { value: 'follow_up', label: 'Follow-ups due', empty: 'No follow-ups due.' },
  { value: 'accepted', label: 'Accepted', empty: 'No accepted quotations.' },
  { value: 'rejected', label: 'Rejected', empty: 'No rejected quotations.' },
  { value: 'all', label: 'All', empty: 'No quotations yet. Start one from a customer or with New quotation.' },
]

export default async function QuotesPage({ searchParams }: PageProps<'/quotes'>) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q : ''
  const current = VIEWS.find((v) => v.value === params.view) ?? VIEWS[0]
  const view = current.value
  const page = pageFromParam(typeof params.page === 'string' ? params.page : undefined)
  const keep: Record<string, string> = { ...(q ? { q } : {}), ...(view !== 'open' ? { view } : {}) }

  const { rows, total } = await listQuotations({ q, page, view })
  if (rows.length === 0 && total > 0 && page > 1) {
    redirect(`/quotes?${new URLSearchParams({ ...keep, page: String(lastPage(total)) })}`)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Quotations</h1>
        <Link href="/quotes/new" className="button-primary">
          New quotation
        </Link>
      </div>
      <SearchBox placeholder="Number, customer or title" value={q} keep={view !== 'open' ? { view } : {}} />
      <nav aria-label="Quotation views" className="flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const query = new URLSearchParams({ ...(q ? { q } : {}), ...(v.value !== 'open' ? { view: v.value } : {}) }).toString()
          return (
            <Link
              key={v.value}
              href={query ? `/quotes?${query}` : '/quotes'}
              aria-current={v.value === view ? 'page' : undefined}
              className="inline-flex min-h-11 items-center rounded border border-line bg-surface px-3 text-sm aria-[current=page]:border-ink aria-[current=page]:font-medium"
            >
              {v.label}
            </Link>
          )
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="text-muted">{q ? `No quotations match “${q}”.` : current.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-ground text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Quotation</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="px-3 py-3">
                    <div className="font-mono text-xs text-muted">{r.label}</div>
                    <Link href={`/quotes/${r.id}`} className="flex min-h-11 items-center font-medium underline-offset-4 hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{r.customerName}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatINR(r.grandTotal)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <QuotationStatusPill status={r.status} />
                      {r.followUpDue && <FollowUpPill />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={total} basePath="/quotes" params={keep} />
    </section>
  )
}
