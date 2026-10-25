export const PAGE_SIZE = 50

/** The page number from ?page=, or 1 when it is missing or not a whole number of 1 or more. */
export function pageFromParam(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) return 1
  const page = Number(value)
  return page >= 1 ? page : 1
}

export function pageRange(page: number): { from: number; to: number } {
  const from = (page - 1) * PAGE_SIZE
  return { from, to: from + PAGE_SIZE - 1 }
}

/** PostgREST answers a page past the last row with this error (HTTP 416) instead of an empty page. */
export function isPastLastPage(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST103'
}

export function lastPage(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
}
