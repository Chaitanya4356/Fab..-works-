'use server'

import { redirect } from 'next/navigation'
import { fail, type ActionResult } from '@/lib/action-result'
import { MESSAGES } from '@/lib/messages'
import { createClient } from '@/lib/supabase/server'

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return fail(MESSAGES.wrongLogin)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.code === 'invalid_credentials') return fail(MESSAGES.wrongLogin)
    if (error.code === 'user_banned') return fail(MESSAGES.switchedOff)
    console.error('signIn failed', error)
    return fail(MESSAGES.unexpected)
  }
  redirect('/')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })
  redirect('/login')
}
