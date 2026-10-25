'use server'

import { revalidatePath } from 'next/cache'
import { activeUserForAction } from '@/lib/auth'
import { fail, ok, zodFieldErrors, type ActionResult } from '@/lib/action-result'
import { dbMessage } from '@/lib/db-errors'
import { MESSAGES } from '@/lib/messages'
import { createAdminClient } from '@/lib/supabase/admin'
import { newUserSchema, resetPasswordSchema, setActiveSchema } from './schema'

const BAN_FOREVER = '876000h'

export async function createUser(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  const parsed = newUserSchema.safeParse(input)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))

  const { fullName, phone, email, password } = parsed.data
  const { data, error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { steelflow_staff: true },
    user_metadata: { full_name: fullName, phone, created_by: auth.data.user.id },
  })
  if (error) {
    if (error.code === 'email_exists') return fail('A user with this login email already exists.')
    if (error.code === 'weak_password') return fail('Choose a stronger password.', { password: 'Choose a stronger password.' })
    console.error('createUser failed', error)
    return fail(MESSAGES.unexpected)
  }
  revalidatePath('/settings/users')
  return ok({ id: data.user.id })
}

/** Switching off: mark the profile first, so the app refuses them at once, then ban the login. Switching on: the reverse. */
export async function setUserActive(input: unknown): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  const parsed = setActiveSchema.safeParse(input)
  if (!parsed.success) return fail(MESSAGES.unexpected)

  const { userId, active } = parsed.data
  const admin = createAdminClient()
  const setProfile = () => auth.data.supabase.rpc('set_profile_active', { p_user: userId, p_active: active })

  if (active) {
    const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    if (banError) {
      console.error('unban failed', banError)
      return fail(MESSAGES.unexpected)
    }
    const { error } = await setProfile()
    if (error) return fail(dbMessage(error))
  } else {
    const { error } = await setProfile()
    if (error) return fail(dbMessage(error))
    const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: BAN_FOREVER })
    if (banError) {
      console.error('ban failed', banError)
      return fail('The login is switched off, but it could not be locked completely. Switch it off again.')
    }
  }
  revalidatePath('/settings/users')
  return ok(null)
}

export async function resetUserPassword(input: unknown): Promise<ActionResult> {
  const auth = await activeUserForAction()
  if (!auth.ok) return auth
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) return fail(MESSAGES.checkFields, zodFieldErrors(parsed.error))

  const { error } = await createAdminClient().auth.admin.updateUserById(parsed.data.userId, {
    password: parsed.data.password,
  })
  if (error) {
    if (error.code === 'weak_password') return fail('Choose a stronger password.', { password: 'Choose a stronger password.' })
    console.error('resetUserPassword failed', error)
    return fail(MESSAGES.unexpected)
  }
  return ok(null)
}
