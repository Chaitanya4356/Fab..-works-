import 'server-only'
import { requireActiveUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type UserRow = {
  id: string
  fullName: string
  phone: string | null
  loginEmail: string
  isActive: boolean
  isYou: boolean
}

/** Every login, active ones first, then by name. */
export async function listUsers(): Promise<UserRow[]> {
  const me = await requireActiveUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, login_email, is_active')
    .order('is_active', { ascending: false })
    .order('full_name')
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    loginEmail: row.login_email ?? '',
    isActive: row.is_active,
    isYou: row.id === me.id,
  }))
}
