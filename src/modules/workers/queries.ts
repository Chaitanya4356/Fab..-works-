import 'server-only'
import { requireActiveUser } from '@/lib/auth'
import { isPastLastPage, pageRange } from '@/lib/paging'
import { toSearch } from '@/lib/search'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import type { Trade } from './labels'

export type Worker = Database['public']['Tables']['workers']['Row']
export type WorkerRow = {
  id: string
  fullName: string
  trade: Trade | null
  phone: string | null
  isActive: boolean
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** One page of workers, sorted by name. Search matches name, trade, skills and mobile numbers. */
export async function listWorkers(opts: {
  q?: string
  page: number
  show: 'active' | 'off'
}): Promise<{ rows: WorkerRow[]; total: number }> {
  await requireActiveUser()
  const supabase = await createClient()
  const { from, to } = pageRange(opts.page)
  const search = toSearch(opts.q)
  const filters = search ? ['full_name', 'trade', 'skills'].map((column) => `${column}.ilike."${search.text}"`) : []
  if (search?.digits) filters.push(`phone.ilike."${search.digits}"`, `alt_phone.ilike."${search.digits}"`)

  const matching = (head: boolean) => {
    const query = supabase
      .from('workers')
      .select('id, full_name, trade, phone, status', { count: 'exact', head })
      .eq('status', opts.show === 'active' ? 'active' : 'inactive')
    return filters.length ? query.or(filters.join(',')) : query
  }

  const { data, error, count } = await matching(false).order('full_name').range(from, to)
  if (isPastLastPage(error)) {
    const { count: total, error: countError } = await matching(true)
    if (countError) throw countError
    return { rows: [], total: total ?? 0 }
  }
  if (error) throw error
  return {
    rows: data.map((w) => ({
      id: w.id,
      fullName: w.full_name,
      trade: w.trade as Trade | null,
      phone: w.phone,
      isActive: w.status === 'active',
    })),
    total: count ?? 0,
  }
}

export async function getWorker(id: string): Promise<Worker | null> {
  await requireActiveUser()
  if (!UUID.test(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from('workers').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}
