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

/** A tiny valid PDF for upload tests. */
export const TEST_PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

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

/** Adds a worker directly in the local database and returns their id. */
export async function createTestWorker(w: {
  fullName: string
  phone?: string
  trade?: string
  status?: 'active' | 'inactive'
}): Promise<string> {
  const { data, error } = await admin()
    .from('workers')
    .insert({ full_name: w.fullName, phone: w.phone ?? null, trade: w.trade ?? null, status: w.status ?? 'active' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** A database client signed in as the owner, for records only an active user can number (spec 4.4). */
export async function ownerClient() {
  const owner = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await owner.auth.signInWithPassword({ email: OWNER.email, password: OWNER.password })
  if (error) throw error
  return owner
}

/** Adds a project as the owner, since project numbers are only given to an active user. */
export async function createTestProject(p: { customerId: string; title: string }): Promise<{ id: string; projectNo: string }> {
  const owner = await ownerClient()
  const { data, error } = await owner
    .from('projects')
    .insert({ customer_id: p.customerId, title: p.title })
    .select('id, project_no')
    .single()
  if (error) throw error
  return { id: data.id, projectNo: data.project_no }
}

/** Saves a quotation through SteelFlow's own functions, and sends or accepts it when asked. */
export async function createTestQuotation(q: {
  customerId: string
  title: string
  scope?: string
  costLines?: { category: string; description: string; qty: number; costRate: number }[]
  items: { description: string; qty: number; rate: number; unit?: string }[]
  status?: 'sent' | 'accepted'
}): Promise<{ id: string; quoteNo: string }> {
  const owner = await ownerClient()
  const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10)
  const { data: id, error } = await owner.rpc('save_quotation_draft', {
    p_quotation_id: null,
    p_header: { customer_id: q.customerId, title: q.title, scope: q.scope ?? null, quote_date: today, margin_percent: 15 },
    p_cost_lines: (q.costLines ?? []).map((l) => ({ category: l.category, description: l.description, qty: l.qty, unit: null, cost_rate: l.costRate })),
    p_items: q.items.map((i) => ({ description: i.description, qty: i.qty, unit: i.unit ?? null, rate: i.rate })),
  })
  if (error) throw error
  for (const status of q.status === 'accepted' ? ['sent', 'accepted'] : q.status ? [q.status] : []) {
    const { error: statusError } = await owner.rpc('set_quotation_status', { p_quotation_id: id, p_status: status })
    if (statusError) throw statusError
  }
  const { data, error: readError } = await owner.from('quotations').select('quote_no').eq('id', id).single()
  if (readError) throw readError
  return { id, quoteNo: data.quote_no }
}

export async function createTestCustomers(names: string[]): Promise<void> {
  const { error } = await admin().from('customers').insert(names.map((name) => ({ name })))
  if (error) throw error
}

/** How many files are stored under a folder of the private "files" bucket. */
export async function countStoredFiles(prefix: string): Promise<number> {
  const { data, error } = await admin().storage.from('files').list(prefix)
  if (error) throw error
  return data.filter((item) => item.id !== null).length
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
