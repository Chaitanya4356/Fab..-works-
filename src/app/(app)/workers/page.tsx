import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Pager } from '@/components/pager'
import { SearchBox } from '@/components/search-box'
import { lastPage, pageFromParam } from '@/lib/paging'
import { TRADE_LABELS } from '@/modules/workers/labels'
import { listWorkers } from '@/modules/workers/queries'

export default async function WorkersPage({ searchParams }: PageProps<'/workers'>) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q : ''
  const show = params.show === 'off' ? 'off' : 'active'
  const page = pageFromParam(typeof params.page === 'string' ? params.page : undefined)
  const keep: Record<string, string> = { ...(q ? { q } : {}), ...(show === 'off' ? { show } : {}) }

  const { rows, total } = await listWorkers({ q, page, show })
  if (rows.length === 0 && total > 0 && page > 1) {
    redirect(`/workers?${new URLSearchParams({ ...keep, page: String(lastPage(total)) })}`)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Workers</h1>
        <Link href="/workers/new" className="button-primary">
          New worker
        </Link>
      </div>
      <SearchBox placeholder="Name, mobile, trade or skill" value={q} keep={show === 'off' ? { show } : {}} />
      <Link
        href={show === 'off' ? '/workers' : '/workers?show=off'}
        className="inline-flex min-h-11 items-center self-start text-sm text-muted underline underline-offset-4"
      >
        {show === 'off' ? 'Show active workers' : 'Show switched-off workers'}
      </Link>

      {rows.length === 0 ? (
        <p className="text-muted">
          {q
            ? `No workers match “${q}”.`
            : show === 'off'
              ? 'No switched-off workers.'
              : 'No workers yet. Add your first worker.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-ground text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Worker</th>
                <th className="px-3 py-2 font-medium">Trade</th>
                <th className="px-3 py-2 font-medium">Mobile</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} className="border-t border-line align-top">
                  <td className="px-3 py-3">
                    <Link href={`/workers/${w.id}`} className="flex min-h-11 items-center font-medium underline-offset-4 hover:underline">
                      {w.fullName}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{w.trade && TRADE_LABELS[w.trade]}</td>
                  <td className="px-3 py-3">
                    {w.phone && (
                      <a href={`tel:+91${w.phone}`} className="inline-flex min-h-11 items-center">
                        {w.phone}
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        w.isActive
                          ? 'rounded border border-ok/40 bg-ok/10 px-2 py-0.5 text-xs text-ok'
                          : 'rounded border border-line px-2 py-0.5 text-xs text-muted'
                      }
                    >
                      {w.isActive ? 'Active' : 'Switched off'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={total} basePath="/workers" params={keep} />
    </section>
  )
}
