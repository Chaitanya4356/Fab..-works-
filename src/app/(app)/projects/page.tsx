import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Pager } from '@/components/pager'
import { SearchBox } from '@/components/search-box'
import { formatDate } from '@/lib/format'
import { lastPage, pageFromParam } from '@/lib/paging'
import { OverduePill, StatusPill } from '@/modules/projects/components/status-pill'
import { listProjects, type ProjectView } from '@/modules/projects/queries'

const VIEWS: { value: ProjectView; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
]

export default async function ProjectsPage({ searchParams }: PageProps<'/projects'>) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q : ''
  const view = VIEWS.find((v) => v.value === params.view)?.value ?? 'open'
  const page = pageFromParam(typeof params.page === 'string' ? params.page : undefined)
  const keep: Record<string, string> = { ...(q ? { q } : {}), ...(view !== 'open' ? { view } : {}) }

  const { rows, total } = await listProjects({ q, page, view })
  if (rows.length === 0 && total > 0 && page > 1) {
    redirect(`/projects?${new URLSearchParams({ ...keep, page: String(lastPage(total)) })}`)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link href="/projects/new" className="button-primary">
          New project
        </Link>
      </div>
      <SearchBox placeholder="Number, title, customer or site" value={q} keep={view !== 'open' ? { view } : {}} />
      <nav aria-label="Project views" className="flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const query = new URLSearchParams({ ...(q ? { q } : {}), ...(v.value !== 'open' ? { view: v.value } : {}) }).toString()
          return (
            <Link
              key={v.value}
              href={query ? `/projects?${query}` : '/projects'}
              aria-current={v.value === view ? 'page' : undefined}
              className="rounded border border-line bg-surface px-3 py-1.5 text-sm aria-[current=page]:border-ink aria-[current=page]:font-medium"
            >
              {v.label}
            </Link>
          )
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="text-muted">
          {q ? `No projects match “${q}”.` : 'No projects yet. Start one from a customer or with New project.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-ground text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Due</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-line align-top">
                  <td className="px-3 py-3">
                    <div className="font-mono text-xs text-muted">{p.projectNo}</div>
                    <Link href={`/projects/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{p.customerName}</td>
                  <td className="whitespace-nowrap px-3 py-3">{p.dueDate ? formatDate(p.dueDate) : '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <StatusPill status={p.status} />
                      {p.isOverdue && <OverduePill />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={total} basePath="/projects" params={keep} />
    </section>
  )
}
