import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fail, ok, type ActionResult } from './action-result'
import { MESSAGES } from './messages'
import { createClient } from './supabase/server'
import type { Database } from './supabase/database.types'

export type ActiveUser = { id: string; fullName: string; email: string }

type UserState =
  | { status: 'none' }
  | { status: 'inactive' }
  | { status: 'active'; user: ActiveUser; supabase: SupabaseClient<Database> }

/** Who is logged in, checked once per request. A switched-off user cannot read profiles, so they read as inactive. */
const currentUser = cache(async (): Promise<UserState> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return { status: 'none' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, login_email, is_active')
    .eq('id', claims.sub)
    .maybeSingle()
  if (!profile?.is_active) return { status: 'inactive' }

  return {
    status: 'active',
    user: { id: profile.id, fullName: profile.full_name, email: profile.login_email ?? claims.email ?? '' },
    supabase,
  }
})

/** For pages and layouts: the active user, or a redirect to the login screen. */
export async function requireActiveUser(): Promise<ActiveUser> {
  const state = await currentUser()
  if (state.status === 'none') redirect('/login')
  if (state.status === 'inactive') redirect('/auth/signout?reason=switched-off')
  return state.user
}

/** For server actions: the active user and their Supabase client, or a plain-language failure. */
export async function activeUserForAction(): Promise<
  ActionResult<{ user: ActiveUser; supabase: SupabaseClient<Database> }>
> {
  const state = await currentUser()
  if (state.status === 'none') return fail(MESSAGES.expired)
  if (state.status === 'inactive') return fail(MESSAGES.switchedOff)
  return ok({ user: state.user, supabase: state.supabase })
}
