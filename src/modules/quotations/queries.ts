import 'server-only'
import { cache } from 'react'
import { requireActiveUser } from '@/lib/auth'
import { isPastLastPage, pageRange } from '@/lib/paging'
import { toSearch } from '@/lib/search'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import { getCustomer } from '@/modules/customers/queries'
import { quoteLabel, type CostCategory, type QuotationStatus } from './labels'

type QuotationRow = Database['public']['Tables']['quotations']['Row']

export type QuotationCostLine = {
  id: string
  category: CostCategory
  description: string
  qty: number
  unit: string | null
  costRate: number
  amount: number
}

export type QuotationItem = {
  id: string
  description: string
  hsnSac: string | null
  qty: number
  unit: string | null
  rate: number
  amount: number
}

export type QuotationDetail = Omit<QuotationRow, 'status'> & {
  status: QuotationStatus
  label: string
  customer: { id: string; name: string; phone: string | null; address: string | null; isActive: boolean }
  costLines: QuotationCostLine[]
  items: QuotationItem[]
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order

/** A quotation with its customer, cost sheet and items. */
export const getQuotation = cache(async (id: string): Promise<QuotationDetail | null> => {
  await requireActiveUser()
  if (!UUID.test(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quotations')
    .select('*, quotation_cost_lines(*), quotation_items(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const customer = await getCustomer(data.customer_id)
  if (!customer) return null

  const { quotation_cost_lines: lines, quotation_items: items, ...row } = data
  return {
    ...row,
    status: row.status as QuotationStatus,
    label: quoteLabel(row.quote_no, row.revision),
    customer: { id: customer.id, name: customer.name, phone: customer.phone, address: customer.address, isActive: customer.is_active },
    costLines: [...lines].sort(bySortOrder).map((l) => ({
      id: l.id,
      category: l.category as CostCategory,
      description: l.description,
      qty: l.qty,
      unit: l.unit,
      costRate: l.cost_rate,
      amount: l.amount,
    })),
    items: [...items].sort(bySortOrder).map((i) => ({
      id: i.id,
      description: i.description,
      hsnSac: i.hsn_sac,
      qty: i.qty,
      unit: i.unit,
      rate: i.rate,
      amount: i.amount,
    })),
  }
})

/** A customer's live quotations, newest first. */
export async function listCustomerQuotations(
  customerId: string,
): Promise<{ id: string; label: string; title: string; status: QuotationStatus; grandTotal: number }[]> {
  await requireActiveUser()
  if (!UUID.test(customerId)) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quotation_list_v')
    .select('id, quote_no, revision, title, status, grand_total')
    .eq('customer_id', customerId)
    .order('quote_date', { ascending: false })
    .order('quote_no', { ascending: false })
  if (error) throw error
  // View columns are typed nullable but are always set for a real quotation.
  return data.map((q) => ({
    id: q.id!,
    label: quoteLabel(q.quote_no!, q.revision!),
    title: q.title!,
    status: q.status as QuotationStatus,
    grandTotal: q.grand_total!,
  }))
}

export type QuoteView = 'open' | 'follow_up' | 'accepted' | 'rejected' | 'all'

export type QuoteListRow = {
  id: string
  label: string
  title: string
  customerName: string
  status: QuotationStatus
  grandTotal: number
  followUpDue: boolean
}

const LIST_COLUMNS = 'id, quote_no, revision, title, customer_name, status, grand_total, is_follow_up_due'

/** One page of live quotations, newest first. Search matches the number, title and customer. */
export async function listQuotations(opts: {
  q?: string
  page: number
  view: QuoteView
}): Promise<{ rows: QuoteListRow[]; total: number }> {
  await requireActiveUser()
  const supabase = await createClient()
  const { from, to } = pageRange(opts.page)
  const search = toSearch(opts.q)
  const filters = search ? ['quote_no', 'title', 'customer_name'].map((column) => `${column}.ilike."${search.text}"`) : []

  const matching = (head: boolean) => {
    let query = supabase.from('quotation_list_v').select(LIST_COLUMNS, { count: 'exact', head })
    if (opts.view === 'open') query = query.in('status', ['draft', 'sent'])
    else if (opts.view === 'follow_up') query = query.eq('is_follow_up_due', true)
    else if (opts.view !== 'all') query = query.eq('status', opts.view)
    return filters.length ? query.or(filters.join(',')) : query
  }

  const { data, error, count } = await matching(false)
    .order('quote_date', { ascending: false, nullsFirst: false })
    .order('quote_no', { ascending: false })
    .range(from, to)
  if (isPastLastPage(error)) {
    const { count: total, error: countError } = await matching(true)
    if (countError) throw countError
    return { rows: [], total: total ?? 0 }
  }
  if (error) throw error
  return {
    rows: data.map((q) => ({
      id: q.id!,
      label: quoteLabel(q.quote_no!, q.revision!),
      title: q.title!,
      customerName: q.customer_name!,
      status: q.status as QuotationStatus,
      grandTotal: q.grand_total!,
      followUpDue: q.is_follow_up_due ?? false,
    })),
    total: count ?? 0,
  }
}

/** Every revision of a quotation number, newest first, replaced ones included. */
export async function listQuotationRevisions(
  quoteNo: string,
): Promise<{ id: string; label: string; status: QuotationStatus; quoteDate: string | null }[]> {
  await requireActiveUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quotations')
    .select('id, quote_no, revision, status, quote_date')
    .eq('quote_no', quoteNo)
    .order('revision', { ascending: false })
  if (error) throw error
  return data.map((q) => ({
    id: q.id,
    label: quoteLabel(q.quote_no, q.revision),
    status: q.status as QuotationStatus,
    quoteDate: q.quote_date,
  }))
}

/** The number a quotation is known by, for linking to it from elsewhere (a project's Overview). */
export async function getQuotationRef(id: string | null): Promise<{ id: string; label: string } | null> {
  await requireActiveUser()
  if (!id || !UUID.test(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from('quotations').select('id, quote_no, revision').eq('id', id).maybeSingle()
  if (error) throw error
  return data && { id: data.id, label: quoteLabel(data.quote_no, data.revision) }
}
