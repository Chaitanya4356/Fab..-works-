import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

/** Supabase as the logged-in user, in the browser. */
export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
