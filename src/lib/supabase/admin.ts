import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/** Supabase with the secret key. Only for creating, banning and resetting logins; it bypasses every database rule. */
export function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
