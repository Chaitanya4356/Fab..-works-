import 'server-only'
import { cache } from 'react'
import { requireActiveUser } from '@/lib/auth'
import { isPastLastPage, pageRange } from '@/lib/paging'
import { toSearch } from '@/lib/search'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import type { ProjectStatus } from './labels'

type ViewRow = Database['public']['Views']['project_list_v']['Row']

export type ProjectListRow = {
  id: string
  projectNo: string
  title: string
  customerId: string
  customerName: string
  customerIsActive: boolean
  status: ProjectStatus
  dueDate: string | null
  isOverdue: boolean
}

/** A project with its customer's name; view columns are typed nullable but are always set for a real row. */
export type ProjectDetail = Omit<ViewRow, 'id' | 'project_no' | 'title' | 'customer_id' | 'customer_name' | 'status'> & {
  id: string
  project_no: string
  title: string
  customer_id: string
  customer_name: string
  status: ProjectStatus
}

export type ProjectView = 'open' | 'completed' | 'cancelled' | 'all'

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LIST_COLUMNS = 'id, project_no, title, customer_id, customer_name, customer_is_active, status, due_date, is_overdue'

function toListRow(r: Pick<ViewRow, 'id' | 'project_no' | 'title' | 'customer_id' | 'customer_name' | 'customer_is_active' | 'status' | 'due_date' | 'is_overdue'>): ProjectListRow {
  return {
    id: r.id!,
    projectNo: r.project_no!,
    title: r.title!,
    customerId: r.customer_id!,
    customerName: r.customer_name!,
    customerIsActive: r.customer_is_active ?? true,
    status: r.status as ProjectStatus,
    dueDate: r.due_date,
    isOverdue: r.is_overdue ?? false,
  }
}

/**
 * One page of projects. "Open" (planned, in progress, on hold) is sorted by due date, soonest first;
 * other views newest first. Search matches number, title, customer and site.
 */
export async function listProjects(opts: {
  q?: string
  page: number
  view: ProjectView
}): Promise<{ rows: ProjectListRow[]; total: number }> {
  await requireActiveUser()
  const supabase = await createClient()
  const { from, to } = pageRange(opts.page)
  const search = toSearch(opts.q)
  const filters = search
    ? ['project_no', 'title', 'customer_name', 'site_address'].map((column) => `${column}.ilike."${search.text}"`)
    : []

  const matching = (head: boolean) => {
    let query = supabase.from('project_list_v').select(LIST_COLUMNS, { count: 'exact', head })
    if (opts.view === 'open') query = query.in('status', ['planned', 'in_progress', 'on_hold'])
    else if (opts.view !== 'all') query = query.eq('status', opts.view)
    return filters.length ? query.or(filters.join(',')) : query
  }

  const ordered =
    opts.view === 'open'
      ? matching(false).order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
      : matching(false).order('created_at', { ascending: false })
  const { data, error, count } = await ordered.range(from, to)
  if (isPastLastPage(error)) {
    const { count: total, error: countError } = await matching(true)
    if (countError) throw countError
    return { rows: [], total: total ?? 0 }
  }
  if (error) throw error
  return { rows: data.map(toListRow), total: count ?? 0 }
}

export const getProject = cache(async (id: string): Promise<ProjectDetail | null> => {
  await requireActiveUser()
  if (!GUID.test(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from('project_list_v').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as ProjectDetail | null
})

export async function listCustomerProjects(customerId: string): Promise<ProjectListRow[]> {
  await requireActiveUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_list_v')
    .select(LIST_COLUMNS)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toListRow)
}
