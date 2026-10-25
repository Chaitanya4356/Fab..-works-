import 'server-only'
import { requireActiveUser } from '@/lib/auth'
import { isPastLastPage, pageRange } from '@/lib/paging'
import { toSearch } from '@/lib/search'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerRow = {
  id: string
  name: string
  contactPerson: string | null
  phone: string | null
  city: string | null
  isActive: boolean
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** One page of customers, sorted by name. Search matches name, contact person, city and mobile numbers. */
export async function listCustomers(opts: {
  q?: string
  page: number
  show: 'active' | 'off'
}): Promise<{ rows: CustomerRow[]; total: number }> {
  await requireActiveUser()
  const supabase = await createClient()
  const { from, to } = pageRange(opts.page)
  const search = toSearch(opts.q)
  const filters = search ? ['name', 'contact_person', 'city'].map((column) => `${column}.ilike."${search.text}"`) : []
  if (search?.digits) filters.push(`phone.ilike."${search.digits}"`, `alt_phone.ilike."${search.digits}"`)

  const matching = (head: boolean) => {
    const query = supabase
      .from('customers')
      .select('id, name, contact_person, phone, city, is_active', { count: 'exact', head })
      .eq('is_active', opts.show === 'active')
    return filters.length ? query.or(filters.join(',')) : query
  }

  const { data, error, count } = await matching(false).order('name').range(from, to)
  if (isPastLastPage(error)) {
    const { count: total, error: countError } = await matching(true)
    if (countError) throw countError
    return { rows: [], total: total ?? 0 }
  }
  if (error) throw error
  return {
    rows: data.map((c) => ({
      id: c.id,
      name: c.name,
      contactPerson: c.contact_person,
      phone: c.phone,
      city: c.city,
      isActive: c.is_active,
    })),
    total: count ?? 0,
  }
}

export async function getCustomer(id: string): Promise<Customer | null> {
  await requireActiveUser()
  if (!UUID.test(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

/** Customers that can be chosen for a new project. */
export async function listActiveCustomerOptions(): Promise<{ id: string; name: string }[]> {
  await requireActiveUser()
  const supabase = await createClient()
  const { data, error } = await supabase.from('customers').select('id, name').eq('is_active', true).order('name')
  if (error) throw error
  return data
}
