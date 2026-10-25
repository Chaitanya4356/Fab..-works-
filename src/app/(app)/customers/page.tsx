import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Pager } from '@/components/pager'
import { SearchBox } from '@/components/search-box'
import { lastPage, pageFromParam } from '@/lib/paging'
import { listCustomers } from '@/modules/customers/queries'

export default async function CustomersPage({ searchParams }: PageProps<'/customers'>) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q : ''
  const show = params.show === 'off' ? 'off' : 'active'
  const page = pageFromParam(typeof params.page === 'string' ? params.page : undefined)
  const keep: Record<string, string> = { ...(q ? { q } : {}), ...(show === 'off' ? { show } : {}) }

  const { rows, total } = await listCustomers({ q, page, show })
  if (rows.length === 0 && total > 0 && page > 1) {
    redirect(`/customers?${new URLSearchParams({ ...keep, page: String(lastPage(total)) })}`)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Link href="/customers/new" className="button-primary">
          New customer
        </Link>
      </div>
      <SearchBox placeholder="Name, mobile or city" value={q} keep={show === 'off' ? { show } : {}} />
      <Link
        href={show === 'off' ? '/customers' : '/customers?show=off'}
        className="self-start text-sm text-muted underline underline-offset-4"
      >
        {show === 'off' ? 'Show active customers' : 'Show switched-off customers'}
      </Link>

      {rows.length === 0 ? (
        <p className="text-muted">
          {q
            ? `No customers match “${q}”.`
            : show === 'off'
              ? 'No switched-off customers.'
              : 'No customers yet. Add your first customer.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-ground text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Mobile</th>
                <th className="px-3 py-2 font-medium">City</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-line align-top">
                  <td className="px-3 py-3">
                    <Link href={`/customers/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                      {c.name}
                    </Link>
                    {c.contactPerson && <div className="text-muted">{c.contactPerson}</div>}
                  </td>
                  <td className="px-3 py-3">{c.phone && <a href={`tel:+91${c.phone}`}>{c.phone}</a>}</td>
                  <td className="px-3 py-3">{c.city}</td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        c.isActive
                          ? 'rounded border border-ok/40 bg-ok/10 px-2 py-0.5 text-xs text-ok'
                          : 'rounded border border-line px-2 py-0.5 text-xs text-muted'
                      }
                    >
                      {c.isActive ? 'Active' : 'Switched off'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={total} basePath="/customers" params={keep} />
    </section>
  )
}
