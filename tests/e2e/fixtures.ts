import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'

/** Local test login only. Never used against hosted projects. */
export const OWNER = { email: 'owner@steelflow.test', password: 'steelflow-dev-1', fullName: 'Test Owner' }

export async function login(page: Page, user: { email: string; password: string }): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Log in' }).click()
  // Wait for the outcome: either the app opens, or the login form shows its message.
  await page.waitForFunction(
    () => !location.pathname.startsWith('/login') || document.querySelector('form [role="alert"]') !== null,
  )
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Adds a customer directly in the local database and returns their id. */
export async function createTestCustomer(c: {
  name: string
  phone?: string
  city?: string
  state?: string
  isActive?: boolean
}): Promise<string> {
  const { data, error } = await admin()
    .from('customers')
    .insert({ name: c.name, phone: c.phone ?? null, city: c.city ?? null, state: c.state ?? null, is_active: c.isActive ?? true })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function createTestCustomers(names: string[]): Promise<void> {
  const { error } = await admin().from('customers').insert(names.map((name) => ({ name })))
  if (error) throw error
}

/** Creates a confirmed local login, or returns the existing one's id. */
export async function createTestUser(user: { email: string; password: string; fullName: string }): Promise<string> {
  const client = admin()
  const { data, error } = await client.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    app_metadata: { steelflow_staff: true },
    user_metadata: { full_name: user.fullName },
  })
  if (!error) return data.user.id
  if (error.code !== 'email_exists') throw error
  const { data: list, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) throw listError
  const existing = list.users.find((u) => u.email === user.email)
  if (!existing) throw error
  return existing.id
}
