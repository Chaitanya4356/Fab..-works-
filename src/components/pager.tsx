import Link from 'next/link'
import { PAGE_SIZE, lastPage } from '@/lib/paging'

/** "Showing 51–100 of 132", with Previous and Next links that keep the other filters. */
export function Pager({
  page,
  total,
  basePath,
  params = {},
}: {
  page: number
  total: number
  basePath: string
  params?: Record<string, string>
}) {
  if (total === 0) return null
  const last = lastPage(total)
  const first = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)
  const href = (p: number) => {
    const search = new URLSearchParams({ ...params, ...(p > 1 ? { page: String(p) } : {}) })
    const query = search.toString()
    return query ? `${basePath}?${query}` : basePath
  }

  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted">
        Showing {first}–{end} of {total}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="button-secondary">
            Previous
          </Link>
        )}
        {page < last && (
          <Link href={href(page + 1)} className="button-secondary">
            Next
          </Link>
        )}
      </div>
    </nav>
  )
}
