# Stage 1 — Customers and Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the workshop keep its customers and projects in SteelFlow: add, find, edit and switch off customers; create and track projects with an automatic `PRJ/2026-27/0001` number, status, dates, contract value and cost estimates; and attach drawings, photos and documents to a project from a phone.

**Architecture:** This builds on stage 0.
- **Tables:** two new tables, `customers` and `projects`, with RLS. The project number is assigned by a `BEFORE INSERT` trigger that calls `next_doc_number`.
- **Project list:** reads from a `security_invoker` view, so search can include the customer's name.
- **Screens:** Server Components read data through module queries that start with `requireActiveUser()`. Client forms call server actions that start with `activeUserForAction()`.
- **Files:** use the stage 0 upload pipeline, plus `recordAttachment` and `removeAttachment`.

**Tech Stack:** As stage 0: Next.js 16.4 App Router, React 19, TypeScript, Tailwind 4, Supabase via `@supabase/ssr` 0.12, Zod 4, Vitest, pgTAP, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-24-steelflow-design.md`. Read sections 4.4, 4.5, 4.9, 4.11, 6.1, 6.2 (People: `customers`; Projects: `projects`), 6.5, 7.2 and 9 (stage 1). Stage 0's plan (`docs/superpowers/plans/2026-10-24-stage-0-foundation.md`) shows the conventions this plan follows.

## Global Constraints

- Everything in stage 0's Global Constraints still applies: `src/proxy.ts`, `getClaims()`, RLS through `public.is_active_user()`, `set_row_meta` and `audit_row` triggers, `security definer` functions with `search_path = ''`, Asia/Kolkata "today", `DD-MM-YYYY`, `₹` with en-IN grouping, plain-language messages, and 44 px touch targets.
- **Every page and every module query starts with `requireActiveUser()`, and every server action with `activeUserForAction()`.** Layouts do not re-run when someone moves around inside the app.
- No deletes (spec 6.5). Customers are switched off (`is_active = false`). Projects are never deleted; they are cancelled through their status.
- Lists are searchable and show **50 rows a page** (spec 4.11).
- Money is `numeric(14,2)`. Forms accept amounts typed the Indian way ("12,50,000", "₹ 5,00,000.50").
- Phone numbers are stored as 10-digit Indian mobiles (`normalizeIndianMobile`). GSTINs are stored in capitals and must match the customer's state when both are given.
- Project statuses, with these labels: `planned` Planned, `in_progress` In progress, `on_hold` On hold, `completed` Completed, `cancelled` Cancelled. A project is **overdue** when `due_date < today` and its status is not completed or cancelled (spec 7.2).
- After every migration, run `npm run db:types`. Run the screen tests with `npm run test:e2e` (it resets the local database first).

**Spec clarifications made in this plan:**
- `projects.quotation_id` is added in stage 3, together with its foreign key, once `quotations` exists. Stage 1 projects are all "direct" projects.
- Project progress % (spec 7.2) arrives with activities in stage 6.
- Stage 1 attaches files to projects only. The attachment code is generic, so other screens can add files in their own stages.
- The stage's "done when" check on a phone needs either the Vercel preview from stage 0 Task 10, or local network access, which is not set up. Until then, the owner checks it in a narrow desktop window.

## Review Focus

1. **Search text with commas, brackets, `%` or quotes** (e.g. `Sharma, (Hyd)`) must show matches or "no matches", never an error page. PostgREST filter syntax breaks on those characters. Tests: Task 2 `toSearch`, and Task 3 e2e `search text with commas or brackets does not break the list`.
2. **Amounts typed the Indian way** must be read exactly: `12,50,000` is 1250000 and `₹ 5,00,000.50` is 500000.5. Three decimals, minus signs or letters get a clear message, never a silent rounding. Tests: Task 2 `rupee fields`.
3. **A switched-off customer** disappears from the new-project picker, but still shows on their existing projects, and stays selectable when editing those projects. Tests: Task 1 pgTAP `a switched-off customer's projects still show their name`, and Task 4 e2e `a switched-off customer is not offered for new projects but stays on old ones`.
4. **Removing a file** deletes it from storage, not just from the list, so free space comes back. A recorded file path must belong to that project. Tests: Task 5 e2e `remove a file and its storage space comes back`, and unit `attachmentPathBelongs`.
5. **Page numbers past the end or not numbers at all** (`?page=99`, `?page=abc`) land on a real page, never a blank or broken list. Tests: Task 2 `paging`, and Task 3 e2e `the customer list pages 50 at a time`.

---

### Task 1: Customers and projects in the database

**Files:**
- Create: `supabase/migrations/20261025000006_customers_projects.sql`
- Modify: `src/lib/supabase/database.types.ts` (regenerated)
- Test: `supabase/tests/database/06_customers_projects.test.sql`

**Interfaces:**
- Consumes: `is_active_user()`, `set_row_meta()`, `audit_row()`, `next_doc_number()`, `today_ist()`, `financial_year()` and the `tests.*` helpers (stage 0).
- Produces:
  - Table `public.customers`, with the columns in spec 6.2 plus the common columns, and `check (length(trim(name)) > 0)`.
  - Table `public.projects`, with the columns in spec 6.2 except `quotation_id`, plus the common columns.
    - `project_no text not null unique`; `customer_id uuid not null references customers`.
    - `status` check (planned, in_progress, on_hold, completed, cancelled), default `planned`.
    - Checks: `due_date >= start_date` when both are set; `contract_value` and every `est_*` are `>= 0`; `length(trim(title)) > 0`.
  - Trigger `projects_assign_number`, `BEFORE INSERT`: sets `project_no := public.next_doc_number('project', public.today_ist())`, ignoring any value sent.
  - View `public.project_list_v`, `with (security_invoker = true)`: every `projects` column plus `customer_name` and `customer_is_active` (from `customers`), plus `is_overdue boolean`, true when `due_date < public.today_ist() and status not in ('completed', 'cancelled')`.
  - Grants and policies for both tables:
    - Select, insert and update policies `to authenticated`, each `public.is_active_user()`.
    - Nobody may delete; `revoke delete … from authenticated`.
    - Update is column-limited on both tables: every column except `id`, the `created_*`/`updated_*` columns, and (on `projects`) `project_no`.
    - `revoke all … from anon`.

- [ ] **Step 1: Write the failing test.**

```sql
-- supabase/tests/database/06_customers_projects.test.sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);
select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');
update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ insert into public.customers (id, name, phone, city, state)
  values ('a0000000-0000-0000-0000-000000000001', 'Sharma Steel Traders', '9876543210', 'Hyderabad', 'Telangana') $$,
  'an active user can add a customer');
select throws_ok($$ insert into public.customers (name) values ('   ') $$, '23514', null, 'a customer needs a name');
select throws_ok($$ delete from public.customers $$, '42501', null, 'customers are never deleted');

select lives_ok($$ insert into public.projects (id, customer_id, title, due_date)
  values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Warehouse shed 40x80', public.today_ist() - 1) $$,
  'an active user can add a project');
select is((select project_no from public.projects where id = 'b0000000-0000-0000-0000-000000000001'),
  'PRJ/' || public.financial_year(public.today_ist()) || '/0001', 'a new project gets the next project number');
select lives_ok($$ insert into public.projects (id, customer_id, title, project_no)
  values ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Staircase', 'MY-OWN-NUMBER') $$,
  'a project sent with its own number still saves');
select is((select project_no from public.projects where id = 'b0000000-0000-0000-0000-000000000002'),
  'PRJ/' || public.financial_year(public.today_ist()) || '/0002', 'the number is always assigned by SteelFlow');
select throws_ok($$ update public.projects set project_no = 'X' $$, '42501', null, 'a project number cannot be changed');
select throws_ok($$ insert into public.projects (customer_id, title, start_date, due_date)
  values ('a0000000-0000-0000-0000-000000000001', 'Gate', '2026-11-10', '2026-11-01') $$, '23514', null, 'the due date cannot be before the start date');
select throws_ok($$ insert into public.projects (customer_id, title, contract_value)
  values ('a0000000-0000-0000-0000-000000000001', 'Gate', -1) $$, '23514', null, 'amounts cannot be negative');
select throws_ok($$ insert into public.projects (customer_id, title)
  values ('a0000000-0000-0000-0000-00000000dead', 'Gate') $$, '23503', null, 'a project needs a real customer');
select results_eq($$ select is_overdue from public.project_list_v where id = 'b0000000-0000-0000-0000-000000000001' $$,
  $$ values (true) $$, 'a project past its due date is overdue');
update public.projects set status = 'completed' where id = 'b0000000-0000-0000-0000-000000000001';
select results_eq($$ select is_overdue from public.project_list_v where id = 'b0000000-0000-0000-0000-000000000001' $$,
  $$ values (false) $$, 'a completed project is not overdue');
update public.customers set is_active = false where id = 'a0000000-0000-0000-0000-000000000001';
select results_eq($$ select customer_name, customer_is_active from public.project_list_v where id = 'b0000000-0000-0000-0000-000000000002' $$,
  $$ values ('Sharma Steel Traders'::text, false) $$, 'a switched-off customer''s projects still show their name');

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select is_empty($$ select id from public.project_list_v $$, 'switched-off users see no projects');
select tests.clear_authentication();
select results_eq($$ select table_name, action from public.audit_log where table_name in ('customers', 'projects') and action = 'INSERT' order by id $$,
  $$ values ('customers'::text, 'INSERT'::text), ('projects', 'INSERT'), ('projects', 'INSERT') $$, 'customers and projects are audited');

select * from finish();
rollback;
```

- [ ] **Step 2: Run `npm run test:db`.** Expected: `06` FAILS (relation `public.customers` does not exist). `01`–`05` pass.
- [ ] **Step 3: Write the migration `20261025000006_customers_projects.sql`** with everything listed under Interfaces.
  - On both tables: triggers `set_row_meta` (before) and `audit_row` (after).
  - Indexes on `projects (customer_id)`, `projects (status, due_date)` and `customers (lower(name))`.
- [ ] **Step 4: Run `npm run test:db`.** Expected: `01`–`06` all pass.
- [ ] **Step 5: Run `npm run db:types && npm run typecheck`.** Expected: pass.
- [ ] **Step 6: Commit.**

```bash
git add -A && git commit -m "feat: add customers and projects tables with automatic project numbers"
```

---

### Task 2: Shared form, search and paging helpers

**Files:**
- Create: `src/lib/form-fields.ts`, `src/lib/gst.ts`, `src/lib/search.ts`, `src/lib/paging.ts`, `src/components/pager.tsx`, `src/components/search-box.tsx`
- Modify: `src/modules/settings/schema.ts` (import the moved helpers; behaviour unchanged)
- Test: `tests/unit/form-fields.test.ts`, `tests/unit/search.test.ts`, `tests/unit/paging.test.ts`. The existing `tests/unit/settings-schema.test.ts` must stay green.

**Interfaces:**
- Produces:
  - In `form-fields.ts`, moved unchanged from `settings/schema.ts`: `optionalText(max: number)`, `optionalCode(pattern: RegExp, message: string, tidy?: (v: string) => string)` and `numberIn(min, max, message, wholeOnly?)`.
  - In `form-fields.ts`, new:
    - `optionalRupees()`: blank becomes `null`.
    - `rupeesOrZero()`: blank becomes `0`.
    - Both strip `₹`, commas and spaces, and accept `/^\d{1,12}(\.\d{1,2})?$/`; anything else gives `Enter an amount in rupees, like 1,25,000 or 1250.50.`
    - `optionalMobile()`: blank becomes `null`; otherwise `normalizeIndianMobile`, or the error `Enter a 10-digit mobile number.`
    - `optionalDate()`: blank becomes `null`; otherwise `YYYY-MM-DD`, or the error `Enter a date.`
  - `gst.ts`: `GSTIN_PATTERN` (moved from the settings schema) and `gstinStateMessage(gstin: string, stateCode: string | null): string | null`. The message is the existing `This GSTIN is for a different state (code 27). Check the state or the GSTIN.`
  - `search.ts`: `toSearch(q: string | undefined): { text: string; digits: string | null } | null`. The result is an `ilike` pattern for text columns, and a digits-only pattern when the query has at least 4 digits, for phone columns.
  - `paging.ts`: `PAGE_SIZE = 50`, `pageFromParam(value: string | undefined): number`, `pageRange(page: number): { from: number; to: number }` and `lastPage(total: number): number`.
  - `<SearchBox placeholder={string} />`: a GET form with an input labelled `Search` (`name="q"`) and a `Search` button. It works without JavaScript and keeps the other query params, except `page`.
  - `<Pager page={number} total={number} basePath={string} params={Record<string, string>} />`: shows `Showing 51–100 of 132`, plus `Previous` and `Next` links.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/form-fields.test.ts
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { optionalDate, optionalMobile, optionalRupees, rupeesOrZero } from '@/lib/form-fields'

const RUPEES = 'Enter an amount in rupees, like 1,25,000 or 1250.50.'
const errorOf = (schema: z.ZodType, value: unknown) => schema.safeParse(value).error?.issues[0]?.message

describe('rupee fields', () => {
  it('read amounts typed the Indian way', () => {
    expect(optionalRupees().parse('12,50,000')).toBe(1250000)
    expect(optionalRupees().parse('₹ 5,00,000.50')).toBe(500000.5)
    expect(optionalRupees().parse('1250')).toBe(1250)
  })
  it('treat a blank as no amount, or as zero for estimates', () => {
    expect(optionalRupees().parse('')).toBeNull()
    expect(rupeesOrZero().parse('  ')).toBe(0)
  })
  it.each(['1.234', '-500', '12abc', '1e5', '1,00,00,00,00,00,000'])('refuse %s with a clear message', (value) => {
    expect(errorOf(optionalRupees(), value)).toBe(RUPEES)
  })
})

describe('mobile and date fields', () => {
  it('tidy a mobile number or explain it', () => {
    expect(optionalMobile().parse('+91 98765-43210')).toBe('9876543210')
    expect(optionalMobile().parse('')).toBeNull()
    expect(errorOf(optionalMobile(), '12345')).toBe('Enter a 10-digit mobile number.')
  })
  it('accept a calendar date or a blank', () => {
    expect(optionalDate().parse('2026-11-30')).toBe('2026-11-30')
    expect(optionalDate().parse('')).toBeNull()
    expect(errorOf(optionalDate(), '30-11-2026')).toBe('Enter a date.')
  })
})
```

```ts
// tests/unit/search.test.ts
import { expect, it } from 'vitest'
import { toSearch } from '@/lib/search'

it('makes a contains-pattern from tidy text', () => {
  expect(toSearch('  Sharma   Steel ')).toEqual({ text: '%Sharma Steel%', digits: null })
})
it('also searches phone numbers by their digits', () => {
  expect(toSearch('98765 43210')).toEqual({ text: '%98765 43210%', digits: '%9876543210%' })
  expect(toSearch('PRJ/2026-27/0001')).toEqual({ text: '%PRJ/2026-27/0001%', digits: '%2026270001%' })
})
it('drops characters that would break the database filter', () => {
  expect(toSearch('Sharma, (Hyd)')).toEqual({ text: '%Sharma Hyd%', digits: null })
  expect(toSearch('50% "off"')).toEqual({ text: '%50 off%', digits: null })
})
it('treats an empty or symbol-only search as no search', () => {
  expect(toSearch(undefined)).toBeNull()
  expect(toSearch('   ')).toBeNull()
  expect(toSearch('%,()')).toBeNull()
})
```

```ts
// tests/unit/paging.test.ts
import { expect, it } from 'vitest'
import { lastPage, pageFromParam, pageRange } from '@/lib/paging'

it('reads a page number, falling back to 1', () => {
  expect(pageFromParam('3')).toBe(3)
  expect(pageFromParam(undefined)).toBe(1)
  expect(pageFromParam('abc')).toBe(1)
  expect(pageFromParam('0')).toBe(1)
  expect(pageFromParam('-2')).toBe(1)
  expect(pageFromParam('2.5')).toBe(1)
})
it('pages 50 rows at a time', () => {
  expect(pageRange(1)).toEqual({ from: 0, to: 49 })
  expect(pageRange(2)).toEqual({ from: 50, to: 99 })
  expect(lastPage(132)).toBe(3)
  expect(lastPage(50)).toBe(1)
  expect(lastPage(0)).toBe(1)
})
```

- [ ] **Step 2: Run `npm test`.** Expected: the three new files FAIL (modules not found). Every other file passes.
- [ ] **Step 3: Implement the helpers.**
  - Move `optionalText`, `optionalCode` and `numberIn` into `form-fields.ts`, and move `GSTIN_PATTERN` and the state-mismatch message into `gst.ts`. `settings/schema.ts` imports them, and its behaviour does not change.
  - `toSearch`:
    - Replace every character in `%_,()\"'*\\` with a space, collapse runs of spaces, and trim.
    - An empty result means no search.
    - The `digits` pattern is all the digits from the original text, used when there are at least 4.
  - `<SearchBox>` and `<Pager>` are Server Components.
- [ ] **Step 4: Run `npm test && npm run typecheck && npm run lint`.** Expected: all pass, including `settings-schema.test.ts`.
- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "feat: add shared form, search and paging helpers"
```

---

### Task 3: Customers

**Files:**
- Create:
  - Module: `src/modules/customers/schema.ts`, `src/modules/customers/queries.ts`, `src/modules/customers/actions.ts`, `src/modules/customers/components/customer-form.tsx`, `src/modules/customers/components/customer-active-toggle.tsx`
  - Screens: `src/app/(app)/customers/page.tsx`, `src/app/(app)/customers/new/page.tsx`, `src/app/(app)/customers/[id]/page.tsx`, `src/app/(app)/customers/[id]/edit/page.tsx`
- Modify: `src/app/(app)/more/page.tsx` (a `Customers` link first), `tests/e2e/fixtures.ts`
- Test: `tests/unit/customer-schema.test.ts`, `tests/e2e/customers.spec.ts`

**Interfaces:**
- Consumes:
  - `optionalText`, `optionalCode`, `optionalMobile`, `GSTIN_PATTERN`, `gstinStateMessage`, `toSearch`, `pageFromParam`, `pageRange`, `lastPage`, `PAGE_SIZE`, `<SearchBox>`, `<Pager>` (Task 2).
  - `INDIA_STATES`, `stateCodeFor`, `requireActiveUser`, `activeUserForAction`, `ok`, `fail`, `zodFieldErrors`, `dbMessage`, `MESSAGES` (stage 0).
- Produces:
  - `customerSchema` and `type CustomerInput`, with fields `name`, `contactPerson`, `phone`, `altPhone`, `email`, `address`, `city`, `state`, `pincode`, `gstin` and `notes`, plus `toCustomerRow(input)`.
  - `listCustomers(opts: { q?: string; page: number; show: 'active' | 'off' }): Promise<{ rows: CustomerRow[]; total: number }>`, where `CustomerRow = { id; name; contactPerson; phone; city; isActive }`. Rows are sorted by name.
  - `getCustomer(id: string): Promise<Customer | null>` and `listActiveCustomerOptions(): Promise<{ id: string; name: string }[]>`.
  - Server actions: `createCustomer(input: unknown): Promise<ActionResult<{ id: string }>>`, `updateCustomer(id: string, input: unknown): Promise<ActionResult>` and `setCustomerActive(id: string, active: boolean): Promise<ActionResult>`.
  - In `tests/e2e/fixtures.ts`: `createTestCustomer(c: { name: string; phone?: string; city?: string; state?: string; isActive?: boolean }): Promise<string>` (an admin insert) and `createTestCustomers(names: string[]): Promise<void>`.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/customer-schema.test.ts
import { describe, expect, it } from 'vitest'
import { customerSchema } from '@/modules/customers/schema'

const valid = {
  name: '  Sharma Steel Traders ', contactPerson: 'Ravi Sharma', phone: '98765 43210', altPhone: '', email: ' Accounts@Sharma.IN ',
  address: '', city: 'Hyderabad', state: 'Telangana', pincode: '500018', gstin: '36abcde1234f1z5', notes: '',
}
const errorFor = (input: object, field: string) =>
  customerSchema.safeParse(input).error?.issues.find((i) => i.path[0] === field)?.message

describe('customerSchema', () => {
  it('tidies a customer', () => {
    expect(customerSchema.parse(valid)).toMatchObject({
      name: 'Sharma Steel Traders', phone: '9876543210', altPhone: null, email: 'accounts@sharma.in',
      address: null, gstin: '36ABCDE1234F1Z5', notes: null,
    })
  })
  it('needs only a name', () => {
    const blank = Object.fromEntries(Object.keys(valid).map((k) => [k, '']))
    expect(customerSchema.safeParse({ ...blank, name: 'Lakshmi Agro' }).success).toBe(true)
  })
  it.each([
    ['name', ' ', 'Enter the customer’s name.'],
    ['phone', '12345', 'Enter a 10-digit mobile number.'],
    ['email', 'not-an-email', 'Enter a valid email address.'],
    ['pincode', '5000', 'Enter a 6-digit PIN code.'],
    ['gstin', '36ABCDE1234F1Y5', 'Enter a 15-character GSTIN, like 36ABCDE1234F1Z5.'],
  ])('explains a bad %s', (field, value, message) => {
    expect(errorFor({ ...valid, [field]: value }, field)).toBe(message)
  })
  it('catches a GSTIN from another state', () => {
    expect(errorFor({ ...valid, gstin: '27ABCDE1234F1Z5' }, 'gstin'))
      .toBe('This GSTIN is for a different state (code 27). Check the state or the GSTIN.')
  })
})
```

```ts
// tests/e2e/customers.spec.ts
import { expect, test } from '@playwright/test'
import { OWNER, createTestCustomer, createTestCustomers, login } from './fixtures'

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('add a customer, find them by name or phone, and edit them', async ({ page }) => {
  await page.goto('/customers')
  await page.getByRole('link', { name: 'New customer' }).click()
  await page.getByLabel('Name').fill('Sharma Steel Traders')
  await page.getByLabel('Contact person').fill('Ravi Sharma')
  await page.getByLabel('Mobile').fill('98765 43210')
  await page.getByLabel('City').fill('Hyderabad')
  await page.getByLabel('State').selectOption('Telangana')
  await page.getByRole('button', { name: 'Save customer' }).click()
  await expect(page.getByRole('heading', { name: 'Sharma Steel Traders' })).toBeVisible()
  await expect(page.getByText('9876543210')).toBeVisible()

  for (const query of ['sharma', '43210']) {
    await page.goto(`/customers?q=${encodeURIComponent(query)}`)
    await expect(page.getByRole('row', { name: /Sharma Steel Traders/ })).toBeVisible()
  }
  await page.goto('/customers?q=zzz')
  await expect(page.getByText('No customers match “zzz”.')).toBeVisible()

  await page.goto('/customers')
  await page.getByRole('row', { name: /Sharma Steel Traders/ }).getByRole('link', { name: 'Sharma Steel Traders' }).click()
  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('City').fill('Secunderabad')
  await page.getByRole('button', { name: 'Save customer' }).click()
  await expect(page.getByText('Secunderabad')).toBeVisible()
})

test('search text with commas or brackets does not break the list', async ({ page }) => {
  await createTestCustomer({ name: 'Hyderabad Sheds' })
  await page.goto('/customers')
  await page.getByLabel('Search').fill('Sharma, (Hyd)')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()
  await expect(page.getByText('No customers match “Sharma, (Hyd)”.')).toBeVisible()
})

test('switching a customer off moves them to the switched-off list', async ({ page }) => {
  const id = await createTestCustomer({ name: 'Old Mill Works' })
  await page.goto(`/customers/${id}`)
  await page.getByRole('button', { name: 'Switch off' }).click()
  await page.getByRole('button', { name: 'Yes, switch off' }).click()
  await expect(page.getByText('Switched off')).toBeVisible()
  await page.goto('/customers')
  await expect(page.getByRole('row', { name: /Old Mill Works/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Show switched-off customers' }).click()
  await expect(page.getByRole('row', { name: /Old Mill Works/ })).toBeVisible()
})

test('the customer list pages 50 at a time', async ({ page }) => {
  await createTestCustomers(Array.from({ length: 55 }, (_, i) => `Paging Customer ${String(i + 1).padStart(2, '0')}`))
  await page.goto('/customers?q=Paging')
  await expect(page.getByText('Showing 1–50 of 55')).toBeVisible()
  await page.getByRole('link', { name: 'Next' }).click()
  await expect(page.getByText('Showing 51–55 of 55')).toBeVisible()
  await page.goto('/customers?q=Paging&page=99')
  await expect(page.getByText('Showing 51–55 of 55')).toBeVisible()
  await page.goto('/customers?q=Paging&page=abc')
  await expect(page.getByText('Showing 1–50 of 55')).toBeVisible()
})
```

- [ ] **Step 2: Run `npm test` and `npm run test:e2e`.** Expected: `customer-schema` FAILS, the customers e2e tests FAIL, and everything else passes.
- [ ] **Step 3: Implement `customers/schema.ts`.**
  - `name` is trimmed, 2–120 characters, with the error `Enter the customer’s name.`
  - The rest uses the Task 2 field helpers. `email` follows the settings schema rule; `state` must be one of `INDIA_STATES` or blank.
  - Cross-field check: `gstinStateMessage(gstin, stateCodeFor(state))`, with the error on `gstin`.
- [ ] **Step 4: Run `npm test`.** Expected: pass.
- [ ] **Step 5: Implement the queries, actions, components and pages.**
  - **`/customers`:**
    - Heading `Customers`, a `New customer` link and `<SearchBox>`.
    - A table with one row per customer: the name (a link to the customer), the mobile (a `tel:` link), the city, and a status pill (`Active` / `Switched off`).
    - `<Pager>`.
    - `?show=off` lists switched-off customers. The link between the two lists reads `Show switched-off customers` / `Show active customers`.
    - When nothing matches: `No customers match “{q}”.` With no search and no customers: `No customers yet. Add your first customer.`
    - A page past the end redirects to the last page.
  - **Search:** `or(name.ilike.{text}, contact_person.ilike.{text}, city.ilike.{text}[, phone.ilike.{digits}, alt_phone.ilike.{digits}])`.
  - **`/customers/new` and `/customers/[id]/edit`:**
    - Both use `<CustomerForm>`, with the labels `Name`, `Contact person`, `Mobile`, `Other phone`, `Email`, `Address`, `City`, `State`, `PIN code`, `GSTIN`, `Notes` and the button `Save customer`.
    - On success, go to `/customers/{id}`. `/customers/new?then=project` goes to `/projects/new?customer={id}` instead.
    - Field errors show under their fields, and the form message is `MESSAGES.checkFields`.
  - **`/customers/[id]`:**
    - A heading with the customer's name, and every filled-in detail.
    - An `Edit` link, a `New project` link (to `/projects/new?customer={id}`), and `<CustomerActiveToggle>`: `Switch off`, then `Yes, switch off`, or `Switch on`.
    - When switched off, the note `Switched off — not offered when starting a new project.`
    - Their projects come from Task 4's `listCustomerProjects`. Until Task 4, the section shows `No projects yet.`
  - **More page:** add a `Customers` link above `Settings`.
- [ ] **Step 6: Run `npm run test:e2e`.** Expected: all customers tests pass, and stage 0's tests still pass. Then run `npm run lint && npm run typecheck && npm test`. Expected: pass.
- [ ] **Step 7: Commit.**

```bash
git add -A && git commit -m "feat: add customers with search, paging and switch-off"
```

---

### Task 4: Projects

**Files:**
- Create:
  - Module: `src/modules/projects/schema.ts`, `src/modules/projects/queries.ts`, `src/modules/projects/actions.ts`, `src/modules/projects/labels.ts`, `src/modules/projects/components/project-form.tsx`, `src/modules/projects/components/status-pill.tsx`
  - Screens: `src/app/(app)/projects/new/page.tsx`, `src/app/(app)/projects/[id]/layout.tsx`, `src/app/(app)/projects/[id]/page.tsx`, `src/app/(app)/projects/[id]/edit/page.tsx`
- Modify: `src/app/(app)/projects/page.tsx` (replaces the placeholder), `src/app/(app)/customers/[id]/page.tsx` (the projects section)
- Test: `tests/unit/project-schema.test.ts`, `tests/e2e/projects.spec.ts`

**Interfaces:**
- Consumes: Task 2's helpers and `<SearchBox>`/`<Pager>`; Task 3's `listActiveCustomerOptions`, `getCustomer` and `createTestCustomer`; `formatINR`, `formatDate`, `todayIST` (stage 0).
- Produces:
  - `PROJECT_STATUSES` (the five values, in order) and `STATUS_LABELS: Record<ProjectStatus, string>` in `labels.ts`.
  - `makeProjectSchema(ctx: { today: string })` and `type ProjectInput`:
    - Fields: `customerId`, `title`, `siteAddress`, `description`, `status`, `startDate`, `dueDate`, `completedDate`, `contractValue`, `estMaterial`, `estLabour`, `estPainting`, `estTransport`, `estOther` and `notes`.
    - When `status` is `completed` and `completedDate` is blank, `completedDate` becomes `ctx.today`. For any other status, `completedDate` becomes `null`.
  - `toProjectRow(input: ProjectInput)`.
  - `listProjects(opts: { q?: string; page: number; view: 'open' | 'completed' | 'cancelled' | 'all' }): Promise<{ rows: ProjectListRow[]; total: number }>`, reading from `project_list_v`.
    - `open` means planned, in progress and on hold, sorted by `due_date` with blanks last.
    - Other views are sorted newest first.
  - `getProject(id: string): Promise<ProjectDetail | null>` (from `project_list_v`), and `listCustomerProjects(customerId: string): Promise<ProjectListRow[]>`.
  - Server actions: `createProject(input: unknown): Promise<ActionResult<{ id: string }>>` and `updateProject(id: string, input: unknown): Promise<ActionResult>`.
  - The project page's tab bar: `<nav aria-label="Project sections">` with the links `Overview` and `Files`. Task 5 fills `Files`; later stages add tabs.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/project-schema.test.ts
import { describe, expect, it } from 'vitest'
import { makeProjectSchema } from '@/modules/projects/schema'

const schema = makeProjectSchema({ today: '2026-10-25' })
const valid = {
  customerId: 'a0000000-0000-0000-0000-000000000001', title: ' Warehouse shed 40x80 ', siteAddress: 'Shamshabad', description: '',
  status: 'planned', startDate: '2026-11-01', dueDate: '2026-12-15', completedDate: '', contractValue: '12,50,000',
  estMaterial: '6,00,000', estLabour: '1,50,000', estPainting: '', estTransport: '40,000', estOther: '', notes: '',
}
const errorFor = (input: object, field: string) =>
  schema.safeParse(input).error?.issues.find((i) => i.path[0] === field)?.message

describe('project schema', () => {
  it('tidies a project and reads amounts', () => {
    expect(schema.parse(valid)).toMatchObject({
      title: 'Warehouse shed 40x80', description: null, contractValue: 1250000,
      estMaterial: 600000, estPainting: 0, estTransport: 40000, completedDate: null,
    })
  })
  it('fills in the completion date when a project is marked completed', () => {
    expect(schema.parse({ ...valid, status: 'completed' }).completedDate).toBe('2026-10-25')
    expect(schema.parse({ ...valid, status: 'completed', completedDate: '2026-10-20' }).completedDate).toBe('2026-10-20')
  })
  it.each([
    ['customerId', '', 'Choose a customer.'],
    ['title', ' ', 'Enter a project title.'],
    ['status', 'finished', 'Choose a status.'],
    ['contractValue', '-5', 'Enter an amount in rupees, like 1,25,000 or 1250.50.'],
  ])('explains a bad %s', (field, value, message) => {
    expect(errorFor({ ...valid, [field]: value }, field)).toBe(message)
  })
  it('refuses a due date before the start date', () => {
    expect(errorFor({ ...valid, dueDate: '2026-10-30' }, 'dueDate')).toBe('The due date can’t be before the start date.')
  })
})
```

```ts
// tests/e2e/projects.spec.ts
import { expect, test } from '@playwright/test'
import { OWNER, createTestCustomer, login } from './fixtures'

const isoDaysFromToday = (days: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() + days * 86_400_000))

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('create a project for a customer and find it in the list', async ({ page }) => {
  await createTestCustomer({ name: 'Lakshmi Agro' })
  await page.goto('/projects')
  await page.getByRole('link', { name: 'New project' }).click()
  await page.getByLabel('Customer').selectOption({ label: 'Lakshmi Agro' })
  await page.getByLabel('Title').fill('Warehouse shed 40x80')
  await page.getByLabel('Site address').fill('Shamshabad')
  await page.getByLabel('Due date').fill(isoDaysFromToday(30))
  await page.getByLabel('Contract value (₹)').fill('12,50,000')
  await page.getByLabel('Material (₹)').fill('6,00,000')
  await page.getByRole('button', { name: 'Create project' }).click()

  const number = page.getByText(/^PRJ\/\d{4}-\d{2}\/\d{4}$/)
  await expect(number).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Warehouse shed 40x80' })).toBeVisible()
  await expect(page.getByText('₹12,50,000.00')).toBeVisible()
  const projectNo = (await number.textContent())!

  await page.goto(`/projects?q=${encodeURIComponent(projectNo)}`)
  await expect(page.getByRole('row', { name: /Warehouse shed 40x80/ })).toContainText('Lakshmi Agro')
  await page.goto('/projects?q=lakshmi')
  await expect(page.getByRole('row', { name: /Warehouse shed 40x80/ })).toBeVisible()
})

test('a project past its due date is marked overdue until it is completed', async ({ page }) => {
  await createTestCustomer({ name: 'Ganesh Poultry' })
  await page.goto('/projects/new')
  await page.getByLabel('Customer').selectOption({ label: 'Ganesh Poultry' })
  await page.getByLabel('Title').fill('Poultry shed roof')
  await page.getByLabel('Due date').fill(isoDaysFromToday(-1))
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByText('Overdue', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Status').selectOption('Completed')
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByText('Completed', { exact: true })).toBeVisible()
  await expect(page.getByText('Overdue', { exact: true })).toHaveCount(0)
})

test('a switched-off customer is not offered for new projects but stays on old ones', async ({ page }) => {
  await createTestCustomer({ name: 'Sunrise Cold Storage' })
  await page.goto('/projects/new')
  await page.getByLabel('Customer').selectOption({ label: 'Sunrise Cold Storage' })
  await page.getByLabel('Title').fill('Cold store platform')
  await page.getByRole('button', { name: 'Create project' }).click()
  const projectUrl = page.url()

  await page.getByRole('link', { name: 'Sunrise Cold Storage' }).click()
  await page.getByRole('button', { name: 'Switch off' }).click()
  await page.getByRole('button', { name: 'Yes, switch off' }).click()

  await page.goto('/projects/new')
  await expect(page.getByLabel('Customer').locator('option', { hasText: 'Sunrise Cold Storage' })).toHaveCount(0)
  await page.goto(projectUrl)
  await expect(page.getByRole('link', { name: 'Sunrise Cold Storage' })).toBeVisible()
  await page.getByRole('link', { name: 'Edit' }).click()
  await expect(page.getByLabel('Customer')).toHaveValue(/.+/)
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByRole('heading', { name: 'Cold store platform' })).toBeVisible()
})
```

- [ ] **Step 2: Run `npm test` and `npm run test:e2e`.** Expected: `project-schema` and the projects e2e tests FAIL. Everything else passes.
- [ ] **Step 3: Implement `labels.ts` and `projects/schema.ts`.**
  - `customerId` is a UUID, with the error `Choose a customer.`
  - `title` is 2–150 characters, with the error `Enter a project title.`
  - `status` must be one of `PROJECT_STATUSES`, with the error `Choose a status.`
  - Dates use `optionalDate()`. `contractValue` uses `optionalRupees()`, and the `est*` fields use `rupeesOrZero()`.
  - The due-date check is a cross-field refinement, with its error on `dueDate`.
- [ ] **Step 4: Run `npm test`.** Expected: pass.
- [ ] **Step 5: Implement the queries, actions, components and pages.**
  - **`/projects`:**
    - Heading `Projects`, a `New project` link, `<SearchBox>` and view links (`Open`, `Completed`, `Cancelled`, `All`; default `Open`).
    - A table with one row per project: the project number, the title (a link), the customer's name, the due date (`formatDate`), `<StatusPill>`, and an `Overdue` pill when `is_overdue`.
    - `<Pager>`.
    - When nothing matches: `No projects match “{q}”.` With no projects: `No projects yet. Start one from a customer or with New project.`
  - **Search:** `or(project_no.ilike.{text}, title.ilike.{text}, customer_name.ilike.{text}, site_address.ilike.{text})`.
  - **`/projects/new`:**
    - `<ProjectForm>`, with the customer picker listing active customers by name. `?customer={id}` preselects one.
    - Under the picker, the link `Add a new customer` goes to `/customers/new?then=project`.
  - **`/projects/[id]/edit`:** the same form. When the project's customer is switched off, the picker also offers that customer, labelled `{name} (switched off)`.
  - **Form labels:** `Customer`, `Title`, `Site address`, `Description`, `Status`, `Start date`, `Due date`, `Completed on` (shown only when the status is Completed), `Contract value (₹)`, a fieldset `Estimated cost` holding `Material (₹)`, `Labour (₹)`, `Painting (₹)`, `Transport (₹)` and `Other (₹)`, then `Notes`. The buttons are `Create project` and `Save project`.
  - **`/projects/[id]/layout.tsx`:**
    - Calls `requireActiveUser()` and `getProject` (`notFound()` if missing).
    - Shows the project number (its own element, so the e2e regex can find it) and the `<h1>` title.
    - Shows the customer's name as a link to `/customers/{id}`, `<StatusPill>`, the `Overdue` pill, the `Edit` link, and the `Project sections` tab bar.
  - **Overview (`/projects/[id]/page.tsx`):**
    - Site, description, start, due and completed dates, and notes.
    - Contract value (`formatINR`, or `Not set`).
    - The five estimates with their total, under `Estimated cost`.
  - **The customer's page:** lists their projects (number, title, status), each linked.
- [ ] **Step 6: Run `npm run test:e2e`.** Expected: every test passes. Then run `npm run lint && npm run typecheck && npm test`. Expected: pass.
- [ ] **Step 7: Commit.**

```bash
git add -A && git commit -m "feat: add projects with status, dates, money and overdue marking"
```

---

### Task 5: Project files

**Files:**
- Create: `src/modules/files/queries.ts`, `src/modules/files/components/attachment-list.tsx`, `src/app/(app)/projects/[id]/files/page.tsx`
- Modify: `src/modules/files/paths.ts` (add `attachmentPathBelongs`), `src/modules/files/actions.ts` (add `recordAttachment` and `removeAttachment`), `src/app/(app)/projects/[id]/layout.tsx` (show the file count on the `Files` tab), `tests/e2e/fixtures.ts`
- Test: `tests/unit/file-paths.test.ts` (extend), `tests/e2e/project-files.spec.ts`

**Interfaces:**
- Consumes: `uploadFile`, `validateFile`, `buildObjectPath`, `UploadTarget`, `AttachmentEntityType`, `formatBytes`, `formatDate` (stage 0); `getProject` (Task 4).
- Produces:
  - `attachmentPathBelongs(entityType: AttachmentEntityType, entityId: string, path: string): boolean`. True only for `{entityType}/{entityId}/{name}` with no further `/` and no `..`.
  - `type AttachmentRow = { id: string; fileName: string; mimeType: string | null; sizeBytes: number | null; caption: string | null; createdAt: string; url: string | null; isImage: boolean }`.
  - `listAttachments(entityType: AttachmentEntityType, entityId: string): Promise<AttachmentRow[]>`, newest first. Signed URLs come from one `createSignedUrls(paths, 600)` call.
  - `countAttachments(entityType, entityId): Promise<number>`.
  - Server actions:
    - `recordAttachment(input: unknown): Promise<ActionResult<{ id: string }>>`:
      - Input: `{ entityType, entityId, path, fileName, mimeType, sizeBytes }`.
      - Refuses a path that doesn't belong to the entity, and an entity type with no screen yet. For stage 1, only `project` is accepted, checked against `projects`.
      - Then `revalidatePath('/projects/{id}/files')`.
    - `removeAttachment(id: string): Promise<ActionResult>`: reads the row, deletes it, then removes the storage object. If the object can't be removed, it logs that and still succeeds.
  - `<AttachmentList entityType entityId items={AttachmentRow[]} />`:
    - A file input labelled `Add photo or file`, with `accept="image/*,application/pdf,.dwg,.dxf"` and `multiple`.
    - Files upload one at a time with `uploadFile` then `recordAttachment`, showing `Uploading 2 of 3…`.
    - Each item shows a thumbnail (`<img alt={fileName}>`) for images, or the file name with its size and date. Each has a `Remove` button, then `Yes, remove`.
    - Each upload error shows as `{file name}: {message}`, e.g. `notes.docx: This file type isn't supported. …`.
  - In `tests/e2e/fixtures.ts`: `countStoredFiles(prefix: string): Promise<number>`, using the admin `storage.from('files').list(prefix)`.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/file-paths.test.ts — add
import { attachmentPathBelongs } from '@/modules/files/paths'

it('only accepts a file path inside that record’s own folder', () => {
  const id = 'b0000000-0000-0000-0000-000000000001'
  expect(attachmentPathBelongs('project', id, `project/${id}/a1-shed-ga.pdf`)).toBe(true)
  expect(attachmentPathBelongs('project', id, `project/b0000000-0000-0000-0000-000000000002/a1.pdf`)).toBe(false)
  expect(attachmentPathBelongs('project', id, `customer/${id}/a1.pdf`)).toBe(false)
  expect(attachmentPathBelongs('project', id, `project/${id}/../other/a1.pdf`)).toBe(false)
  expect(attachmentPathBelongs('project', id, `project/${id}/sub/a1.pdf`)).toBe(false)
  expect(attachmentPathBelongs('project', id, 'settings/logo/a1.png')).toBe(false)
})
```

```ts
// tests/e2e/project-files.spec.ts
import { expect, test } from '@playwright/test'
import { OWNER, countStoredFiles, createTestCustomer, login } from './fixtures'

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

test('attach a drawing and a site photo to a project, then remove one', async ({ page }) => {
  await createTestCustomer({ name: 'Files Test Customer' })
  await login(page, OWNER)
  await page.goto('/projects/new')
  await page.getByLabel('Customer').selectOption({ label: 'Files Test Customer' })
  await page.getByLabel('Title').fill('Mezzanine floor')
  await page.getByRole('button', { name: 'Create project' }).click()
  const projectId = new URL(page.url()).pathname.split('/')[2]

  await page.getByRole('navigation', { name: 'Project sections' }).getByRole('link', { name: /Files/ }).click()
  await page.getByLabel('Add photo or file').setInputFiles({ name: 'Mezzanine GA.pdf', mimeType: 'application/pdf', buffer: PDF })
  await expect(page.getByText('Mezzanine GA.pdf')).toBeVisible()

  const png = await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 3000
    c.height = 2000
    c.getContext('2d')!.fillRect(0, 0, 3000, 2000)
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  await page.getByLabel('Add photo or file').setInputFiles({ name: 'site-photo.png', mimeType: 'image/png', buffer: Buffer.from(png) })
  const photo = page.getByRole('img', { name: 'site-photo.jpg' })
  await expect(photo).toBeVisible()
  expect(await photo.evaluate((el: HTMLImageElement) => Math.max(el.naturalWidth, el.naturalHeight))).toBeLessThanOrEqual(1600)
  expect(await countStoredFiles(`project/${projectId}`)).toBe(2)

  await page.getByRole('listitem').filter({ hasText: 'Mezzanine GA.pdf' }).getByRole('button', { name: 'Remove' }).click()
  await page.getByRole('button', { name: 'Yes, remove' }).click()
  await expect(page.getByText('Mezzanine GA.pdf')).toHaveCount(0)
  await expect.poll(() => countStoredFiles(`project/${projectId}`)).toBe(1)
})

test('a file type SteelFlow cannot use is refused with a reason', async ({ page }) => {
  await createTestCustomer({ name: 'Files Test Customer 2' })
  await login(page, OWNER)
  await page.goto('/projects/new')
  await page.getByLabel('Customer').selectOption({ label: 'Files Test Customer 2' })
  await page.getByLabel('Title').fill('Canopy')
  await page.getByRole('button', { name: 'Create project' }).click()
  await page.getByRole('navigation', { name: 'Project sections' }).getByRole('link', { name: /Files/ }).click()
  await page.getByLabel('Add photo or file').setInputFiles({ name: 'notes.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('x') })
  await expect(page.getByText(/notes\.docx: This file type isn't supported\./)).toBeVisible()
})
```

- [ ] **Step 2: Run `npm test` and `npm run test:e2e`.** Expected: the new unit test and the project-files e2e tests FAIL. Everything else passes.
- [ ] **Step 3: Implement `attachmentPathBelongs`.** Run `npm test`. Expected: pass.
- [ ] **Step 4: Implement the queries, actions, `<AttachmentList>`, the `Files` page, and the file count on the tab.** The `Files` tab reads `Files (2)`.
- [ ] **Step 5: Run `npm run test:e2e`.** Expected: every test passes. Then run `npm run lint && npm run typecheck && npm test && npm run test:db`. Expected: pass.
- [ ] **Step 6: Commit.**

```bash
git add -A && git commit -m "feat: attach drawings, photos and documents to projects"
```

---

### Owner check (stage 1 "done when")

Once the whole branch passes and has been reviewed, the owner adds a real customer and project, then attaches a drawing. They use the Vercel preview on a phone once stage 0 Task 10 is done, or, until then, a narrow desktop window at http://localhost:3000.
