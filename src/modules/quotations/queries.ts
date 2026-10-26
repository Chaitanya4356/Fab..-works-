import 'server-only'
import { cache } from 'react'
import { requireActiveUser } from '@/lib/auth'
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
