# Stage 2 — Workers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the workshop keep its workers in SteelFlow: add, find, edit and switch off worker profiles (trade, contact, wage, experience); keep their documents such as ID proof on the profile; and put workers on a project's team, so each project page shows who is working on it and each worker's profile shows their projects.

**Architecture:** This builds on stages 0 and 1.
- **Tables:** two new tables, `workers` and `project_workers`, with RLS.
- **Shared view:** a `security_invoker` view `project_team_v` joins team places with worker and project names. The project's Team tab and the worker's profile both read it, so neither module queries the other's tables (spec 4.3).
- **Screens:** a Workers list with its own main-menu item, worker pages, and a new Team tab on the project page. They follow Stage 1's customer screens: Server Components read through module queries that start with `requireActiveUser()`, and client forms call server actions through `runAction`.
- **Documents:** these reuse Stage 1's attachment pipeline, with `worker` added as a file owner.

**Tech Stack:** As stage 1: Next.js 16.4 App Router, React 19, TypeScript, Tailwind 4, Supabase via `@supabase/ssr` 0.12, Zod 4, Vitest, pgTAP, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-24-steelflow-design.md`. Read:
- 4.3, 4.4, 4.5, 4.10 and 4.11;
- 6.1 and 6.2 (People: `workers`; Projects and fabrication: `project_workers`), 6.3 and 6.5;
- 7.6;
- 9 (stage 2).

Stage 1's plan (`docs/superpowers/plans/2026-10-25-stage-1-customers-projects.md`) and its customer code are the pattern this plan follows.

## Global Constraints

- Everything in Stage 0's and Stage 1's Global Constraints still applies. That includes:
  - `requireActiveUser()` at the start of every page and query, and `activeUserForAction()` at the start of every action;
  - RLS through `public.is_active_user()`;
  - `set_row_meta` and `audit_row` triggers;
  - `DD-MM-YYYY` dates and `₹` with en-IN grouping;
  - 44 px touch targets;
  - 50 rows a page;
  - no deletes.
- Every client call to a server action goes through `runAction` (`src/lib/run-action.ts`), so a save that cannot reach the server keeps the form.
- **Trades:** `fitter` Fitter, `welder` Welder, `fabricator` Fabricator, `painter` Painter, `helper` Helper, `supervisor` Supervisor, `other` Other.
- **Pay types:** `daily` Daily, `hourly` Hourly, `monthly` Monthly. The wage shows as `₹650.00 per day`, `₹90.00 per hour` or `₹18,000.00 per month`.
- **Worker statuses:**
  - `active` shows as Active;
  - `inactive` shows as Switched off, the same words as switched-off customers.
- **Workers are never deleted** (spec 7.6). Switched-off workers are hidden from the team picker, but their profile, documents and team history stay.
- **A worker is on a project's team at most once at a time** (spec 6.2).
  - Taking them off sets a last day (`to_date`).
  - The row is never deleted, and the worker can rejoin later.
  - A place is **current** while it has no last day.
- **Assignments carry no cost** (spec 7.6). There are no payroll, attendance or salary screens.
- After every migration, run `npm run db:types`. Run the screen tests with `npm run test:e2e`, which resets the local database first.

**Spec clarifications made in this plan:**
- **`project_team_v` is a new shared view.** It is added to spec 6.3, so the project and worker screens read team data without crossing module tables.
- **`project_workers` has no audit trigger,** because spec 4.7 does not list it. Its common columns record who added or ended each place.
- **Switching a worker off does not end their team places.** The team list marks them "Switched off", so the owner can take them off by hand.
- **A pay rate and a pay type go together.** A rate with no type, or a type with no rate, is refused. The rate is at most ₹10,00,000, which fits `numeric(12,2)` with room to spare.
- **Experience** is 0 to 99.9 years, with at most one decimal, to fit `numeric(4,1)` without silent rounding.
- **Later stages fill in the rest of the worker profile.** Activity assignments arrive in stage 6, labour entries in stage 7, and `worker_assignments_v` in stage 8.
- **Workers gets its own main-menu item, after Projects** (owner's request, 26-10-2026). The side menu on wide screens shows it. The phone bar fits only six labels at 360 px, so on phones Workers stays under More until the phone pass after stage 8. Spec 4.11 records this.
- **Owner decision, 26-10-2026:** the phone "done when" check, the hosted setup and the Live releases wait until every stage is built. Stage 2 is checked by the owner on `localhost`. Spec section 9 records this.

## Review Focus

1. **A switched-off worker.** They disappear from the team picker. They stay on any team they are already on, marked "Switched off", and stay findable under "Show switched-off workers". Tests:
   - Task 2 e2e `a worker who is switched off leaves the list but keeps their record`.
   - Task 4 e2e `a worker switched off later stays on the team, marked switched off`.
2. **The same worker added twice,** from two screens or by a double tap. They end up on the team once, and the second try gets `<name> is already on this team.`, never an error page. Tests:
   - Task 1 pgTAP `a worker is on a project team only once at a time`.
   - Task 4 e2e `adding the same worker from two screens puts them on the team once`.
3. **A last day before the worker joined the team** gets a field message and keeps the form. It is never a crash or a silent save. Tests:
   - Task 1 pgTAP `the last day cannot be before the first`.
   - Task 4 e2e `take a worker off the team; a last day before they joined is refused`.
4. **Wages typed the Indian way are read exactly:** `1,500` is 1500. A rate too big for the column (`25,00,00,000`) gets a message, not a database overflow. Tests: Task 2 unit `explains a bad payRate`.
5. **Experience with two decimals or words** (`5.55`, `five`) gets a message, never silent rounding. Tests: Task 2 unit `explains a bad experienceYears`.

---

### Task 1: Workers and project teams in the database

**Files:**
- Create: `supabase/migrations/20261026000007_workers.sql`
- Modify:
  - `src/lib/supabase/database.types.ts` (regenerated);
  - `docs/superpowers/specs/2026-10-24-steelflow-design.md` (one row added to the 6.3 table).
- Test: `supabase/tests/database/07_workers.test.sql`

**Interfaces:**
- Consumes: `is_active_user()`, `set_row_meta()`, `audit_row()`, `today_ist()` and `financial_year()`; `customers` and `projects` (stage 1); `tests.create_user`, `tests.authenticate_as` and `tests.clear_authentication`.
- Produces:
  - **Table `public.workers`.** It has the columns in spec 6.2 plus the common columns.
    - Checks:
      - `length(trim(full_name)) > 0`;
      - `trade` is one of the seven trades, or null;
      - `pay_type` is in (`daily`, `hourly`, `monthly`), or null;
      - `pay_rate >= 0` and `experience_years >= 0`;
      - `status` is in (`active`, `inactive`), not null, default `active`;
      - constraint `workers_pay_together`: `(pay_type is null) = (pay_rate is null)`.
    - Index on `lower(full_name)`.
  - **Table `public.project_workers`.** It has the columns in spec 6.2 plus the common columns.
    - `project_id uuid not null references projects` and `worker_id uuid not null references workers`.
    - Constraint `project_workers_last_after_first`: `from_date is null or to_date is null or to_date >= from_date`.
    - Unique index `project_workers_one_open_idx` on `(project_id, worker_id) where to_date is null`.
    - Indexes on `(worker_id)` and `(project_id)`.
  - **Triggers.**
    - `set_row_meta` on both tables.
    - `audit_row` on `workers` only.
  - **View `public.project_team_v`,** `with (security_invoker = true)`.
    - Columns from `project_workers`: `id`, `project_id`, `worker_id`, `role`, `from_date`, `to_date` and `notes`.
    - `is_current boolean`, which is `to_date is null`.
    - Worker columns: `worker_name` (`full_name`), `trade`, `worker_phone` (`phone`) and `worker_status` (`status`).
    - Project columns: `project_no`, `project_title` (`title`) and `project_status` (`status`).
  - **Grants and policies,** as in stage 1.
    - Select, insert and update policies `to authenticated`, each checking `public.is_active_user()`.
    - `revoke delete` on both tables, and `revoke all … from anon` on both tables and the view.
    - Update is column-limited:
      - on `workers`, every spec column;
      - on `project_workers`, only `role`, `from_date`, `to_date` and `notes`.
    - `grant select on project_team_v to authenticated`.

- [ ] **Step 1: Write the failing test.**

```sql
-- supabase/tests/database/07_workers.test.sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);
select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');
update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
insert into public.customers (id, name) values ('a0000000-0000-0000-0000-000000000001', 'Sharma Steel Traders');
insert into public.projects (id, customer_id, title) values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Warehouse shed');

select lives_ok($$ insert into public.workers (id, full_name, phone, trade, pay_type, pay_rate)
  values ('c0000000-0000-0000-0000-000000000001', 'Ramesh Kumar', '9876500001', 'welder', 'daily', 650) $$,
  'an active user can add a worker');
select is((select status from public.workers where id = 'c0000000-0000-0000-0000-000000000001'), 'active', 'a new worker is active');
select throws_ok($$ insert into public.workers (full_name) values ('  ') $$, '23514', null, 'a worker needs a name');
select throws_ok($$ insert into public.workers (full_name, trade) values ('Imran', 'plumber') $$, '23514', null, 'the trade comes from the list');
select throws_ok($$ insert into public.workers (full_name, pay_type, pay_rate) values ('Imran', 'daily', -1) $$, '23514', null, 'a pay rate cannot be negative');
select throws_ok($$ insert into public.workers (full_name, pay_rate) values ('Imran', 650) $$, '23514', null, 'a pay rate needs a pay type');
select throws_ok($$ delete from public.workers $$, '42501', null, 'workers are never deleted');

select lives_ok($$ insert into public.project_workers (id, project_id, worker_id, role, from_date)
  values ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
  'Lead welder', public.today_ist() - 10) $$, 'a worker joins a project team');
select throws_ok($$ insert into public.project_workers (project_id, worker_id)
  values ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001') $$,
  '23505', null, 'a worker is on a project team only once at a time');
select throws_ok($$ update public.project_workers set to_date = public.today_ist() - 11 where id = 'd0000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'the last day cannot be before the first');
update public.project_workers set to_date = public.today_ist() - 1 where id = 'd0000000-0000-0000-0000-000000000001';
select lives_ok($$ insert into public.project_workers (id, project_id, worker_id, from_date)
  values ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', public.today_ist()) $$,
  'a worker taken off the team can rejoin later');
select results_eq($$ select is_current from public.project_team_v where worker_id = 'c0000000-0000-0000-0000-000000000001' order by from_date $$,
  $$ values (false), (true) $$, 'the team view tells current places from past ones');
select results_eq($$ select worker_name, trade, project_no, project_title from public.project_team_v where id = 'd0000000-0000-0000-0000-000000000002' $$,
  $$ values ('Ramesh Kumar'::text, 'welder'::text, 'PRJ/' || public.financial_year(public.today_ist()) || '/0001', 'Warehouse shed'::text) $$,
  'the team view shows the worker and the project');
select throws_ok($$ delete from public.project_workers $$, '42501', null, 'team history is never deleted');
select throws_ok($$ update public.project_workers set worker_id = worker_id $$, '42501', null, 'a team place cannot move to another worker');

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select is_empty($$ select id from public.workers $$, 'switched-off users see no workers');
select is_empty($$ select id from public.project_team_v $$, 'switched-off users see no teams');
select tests.clear_authentication();
select results_eq($$ select table_name, action from public.audit_log where table_name = 'workers' order by id $$,
  $$ values ('workers'::text, 'INSERT'::text) $$, 'workers are audited');

select * from finish();
rollback;
```

- [ ] **Step 2: Run `npm run test:db`.** Expected: `07` FAILS, because relation `public.workers` does not exist. `01`–`06` pass.
- [ ] **Step 3: Write the migration `20261026000007_workers.sql`** with everything listed under Interfaces. Add the view to the spec's 6.3 table as `project_team_v`: "Each team place with the worker's name, trade and phone, the project's number, title and status, and `is_current` (no last day yet)".
- [ ] **Step 4: Run `npm run test:db`.** Expected: `01`–`07` all pass.
- [ ] **Step 5: Run `npm run db:types && npm run typecheck`.** Expected: pass.
- [ ] **Step 6: Commit.**

```bash
git add -A && git commit -m "feat: add workers and project team tables"
```

---

### Task 2: Workers list, profile and form

**Files:**
- Create:
  - Module: `src/modules/workers/labels.ts`, `src/modules/workers/schema.ts`, `src/modules/workers/form-values.ts`, `src/modules/workers/queries.ts`, `src/modules/workers/actions.ts`, `src/modules/workers/components/worker-form.tsx`, `src/modules/workers/components/worker-active-toggle.tsx`
  - Screens: `src/app/(app)/workers/page.tsx`, `src/app/(app)/workers/new/page.tsx`, `src/app/(app)/workers/[id]/page.tsx`, `src/app/(app)/workers/[id]/edit/page.tsx`
- Modify:
  - `src/components/app-nav.tsx`: a Workers item after Projects, shown from 768 px only.
  - `src/app/(app)/more/page.tsx`: a `Workers` link first, shown on phones only.
  - `tests/e2e/fixtures.ts`.
- Test: `tests/unit/worker-schema.test.ts`, `tests/unit/worker-labels.test.ts`, `tests/e2e/workers.spec.ts`

**Interfaces:**
- Consumes:
  - `optionalText`, `optionalCode`, `optionalMobile`, `optionalDate`, `optionalRupees`, `toSearch`, `pageRange`, `isPastLastPage`, `lastPage`, `pageFromParam`, `<SearchBox>`, `<Pager>`, `<TextField>` and `<FormMessage>` (stage 1).
  - `formatINR`, `formatDate`, `runAction`, `requireActiveUser`, `activeUserForAction`, `ok`, `fail`, `zodFieldErrors`, `dbMessage` and `MESSAGES` (stage 0).
- Produces:
  - In `labels.ts`:
    - `TRADES`, `type Trade` and `TRADE_LABELS`;
    - `PAY_TYPES`, `type PayType` and `PAY_TYPE_LABELS`;
    - `wageText(payType: PayType | null, payRate: number | string | null): string | null`.
  - In `schema.ts`, `workerSchema` and `type WorkerInput`, plus `toWorkerRow(input)`. The fields are `fullName`, `trade`, `phone`, `altPhone`, `address`, `joiningDate`, `skills`, `experienceYears`, `payType`, `payRate`, `emergencyContactName`, `emergencyContactPhone` and `notes`.
  - In `form-values.ts`, `type WorkerFormValues` (every field a string), `EMPTY_WORKER` and `workerFormValues(worker: Worker): WorkerFormValues`.
  - In `queries.ts`:
    - `type Worker`, the table row;
    - `type WorkerRow = { id; fullName; trade; phone; isActive }`;
    - `listWorkers(opts: { q?: string; page: number; show: 'active' | 'off' }): Promise<{ rows: WorkerRow[]; total: number }>`, sorted by name. Search matches `full_name`, `trade` and `skills`, and also `phone` and `alt_phone` by digits;
    - `getWorker(id: string): Promise<Worker | null>`.
  - Server actions:
    - `createWorker(input: unknown): Promise<ActionResult<{ id: string }>>`;
    - `updateWorker(id: string, input: unknown): Promise<ActionResult>`;
    - `setWorkerActive(id: string, active: boolean): Promise<ActionResult>`.
  - `<WorkerForm workerId?: string initial: WorkerFormValues />`. Its labels are:
    - Full name, Trade, Mobile, Other phone, Address and Joining date;
    - Skills, Experience (years), Pay type and Pay rate (₹);
    - Emergency contact name, Emergency contact mobile and Notes.

    The button is `Save worker`.
  - In `tests/e2e/fixtures.ts`, `createTestWorker(w: { fullName: string; phone?: string; trade?: string; status?: 'active' | 'inactive' }): Promise<string>`, an admin insert.
  - **Main menu.** `ITEMS` in `app-nav.tsx` gains `{ href: '/workers', label: 'Workers', wideOnly: true }` after Projects. A `wideOnly` item's `<li>` is `hidden md:block`, so the phone bar keeps its six slots. The More page's `Workers` link is `md:hidden`.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/worker-schema.test.ts
import { describe, expect, it } from 'vitest'
import { workerSchema } from '@/modules/workers/schema'

const valid = {
  fullName: '  Ramesh Kumar ', trade: 'welder', phone: '+91 98765 00001', altPhone: '', address: '', joiningDate: '2026-04-01',
  skills: 'TIG, MIG', experienceYears: '5.5', payType: 'daily', payRate: '1,500', emergencyContactName: 'Sita Kumar',
  emergencyContactPhone: '98765 00002', notes: '',
}
const errorFor = (input: object, field: string) =>
  workerSchema.safeParse(input).error?.issues.find((i) => i.path[0] === field)?.message

describe('workerSchema', () => {
  it('tidies a worker', () => {
    expect(workerSchema.parse(valid)).toMatchObject({
      fullName: 'Ramesh Kumar', trade: 'welder', phone: '9876500001', altPhone: null, joiningDate: '2026-04-01',
      experienceYears: 5.5, payType: 'daily', payRate: 1500, emergencyContactPhone: '9876500002', notes: null,
    })
  })
  it('needs only a name', () => {
    const blank = Object.fromEntries(Object.keys(valid).map((k) => [k, '']))
    expect(workerSchema.parse({ ...blank, fullName: 'Imran' })).toMatchObject({ trade: null, payType: null, payRate: null, experienceYears: null })
  })
  it.each([
    ['fullName', ' ', 'Enter the worker’s name.'],
    ['trade', 'plumber', 'Choose a trade from the list.'],
    ['phone', '12345', 'Enter a 10-digit mobile number.'],
    ['joiningDate', '01-04-2026', 'Enter a date.'],
    ['experienceYears', '5.55', 'Enter years of experience, like 5 or 5.5.'],
    ['experienceYears', 'five', 'Enter years of experience, like 5 or 5.5.'],
    ['payRate', '25,00,00,000', 'Enter a pay rate up to ₹10,00,000.'],
    ['payRate', '-650', 'Enter an amount in rupees, like 1,25,000 or 1250.50.'],
  ])('explains a bad %s', (field, value, message) => {
    expect(errorFor({ ...valid, [field]: value }, field)).toBe(message)
  })
  it('keeps a pay rate and its pay type together', () => {
    expect(errorFor({ ...valid, payType: '' }, 'payType')).toBe('Choose daily, hourly or monthly.')
    expect(errorFor({ ...valid, payRate: '' }, 'payRate')).toBe('Enter the pay rate.')
  })
})
```

```ts
// tests/unit/worker-labels.test.ts
import { expect, it } from 'vitest'
import { wageText } from '@/modules/workers/labels'

it('shows a wage with its period', () => {
  expect(wageText('daily', 650)).toBe('₹650.00 per day')
  expect(wageText('hourly', '90')).toBe('₹90.00 per hour')
  expect(wageText('monthly', 18000)).toBe('₹18,000.00 per month')
  expect(wageText(null, null)).toBeNull()
})
```

```ts
// tests/e2e/workers.spec.ts
import { expect, test } from '@playwright/test'
import { OWNER, createTestWorker, login } from './fixtures'

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('add a worker, find them by name, mobile or trade, and edit them', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'More' }).click()
  await page.getByRole('main').getByRole('link', { name: 'Workers' }).click()
  await page.getByRole('link', { name: 'New worker' }).click()
  await page.getByLabel('Full name').fill('Ramesh Kumar')
  await page.getByLabel('Trade').selectOption({ label: 'Welder' })
  await page.getByLabel('Mobile', { exact: true }).fill('98765 00001')
  await page.getByLabel('Joining date').fill('2026-04-01')
  await page.getByLabel('Experience (years)').fill('5.5')
  await page.getByLabel('Pay type').selectOption({ label: 'Daily' })
  await page.getByLabel('Pay rate (₹)').fill('650')
  await page.getByRole('button', { name: 'Save worker' }).click()

  await expect(page.getByRole('heading', { name: 'Ramesh Kumar' })).toBeVisible()
  await expect(page.getByText('₹650.00 per day')).toBeVisible()
  await expect(page.getByText('01-04-2026')).toBeVisible()
  await expect(page.getByText('5.5 years')).toBeVisible()

  for (const q of ['ramesh', '+91 98765 00001', 'weld']) {
    await page.goto(`/workers?q=${encodeURIComponent(q)}`)
    const link = page.getByRole('link', { name: 'Ramesh Kumar' })
    await expect(link).toBeVisible()
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }

  await page.getByRole('link', { name: 'Ramesh Kumar' }).click()
  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Pay rate (₹)').fill('700')
  await page.getByRole('button', { name: 'Save worker' }).click()
  await expect(page.getByText('₹700.00 per day')).toBeVisible()
})

test('a bad entry keeps what was typed and says what to fix', async ({ page }) => {
  await page.goto('/workers/new')
  await page.getByLabel('Full name').fill('Imran Khan')
  await page.getByLabel('Experience (years)').fill('5.55')
  await page.getByLabel('Pay rate (₹)').fill('650')
  await page.getByRole('button', { name: 'Save worker' }).click()
  await expect(page.getByText('Enter years of experience, like 5 or 5.5.')).toBeVisible()
  await expect(page.getByLabel('Full name')).toHaveValue('Imran Khan')

  await page.getByLabel('Experience (years)').fill('5')
  await page.getByRole('button', { name: 'Save worker' }).click()
  await expect(page.getByText('Choose daily, hourly or monthly.')).toBeVisible()
})

test.describe('on a wide screen', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })
  test('Workers has its own item in the side menu', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main' })
    await nav.getByRole('link', { name: 'Workers' }).click()
    await expect(page.getByRole('heading', { name: 'Workers' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Workers' })).toHaveAttribute('aria-current', 'page')
    await nav.getByRole('link', { name: 'More' }).click()
    await expect(page.getByRole('main').getByRole('link', { name: 'Workers' })).toHaveCount(0)
  })
})

test('a worker who is switched off leaves the list but keeps their record', async ({ page }) => {
  await createTestWorker({ fullName: 'Suresh Babu', trade: 'helper' })
  await page.goto('/workers?q=Suresh')
  await page.getByRole('link', { name: 'Suresh Babu' }).click()
  await page.getByRole('button', { name: 'Switch off' }).click()
  await page.getByRole('button', { name: 'Yes, switch off' }).click()
  await expect(page.getByText('Switched off — not offered when adding to a project team.')).toBeVisible()

  await page.goto('/workers?q=Suresh')
  await expect(page.getByText('No workers match “Suresh”.')).toBeVisible()
  await page.goto('/workers?show=off&q=Suresh')
  await expect(page.getByRole('link', { name: 'Suresh Babu' })).toBeVisible()
})
```

- [ ] **Step 2: Run `npm test`, then `npx playwright test workers`.** Expected: the unit files and `workers.spec.ts` FAIL, because the modules are not found and there is no Workers link. Every other test passes.
- [ ] **Step 3: Implement the module and the screens.** Copy the customer module's shape. These are the points that differ:
  - **Schema:**
    - `fullName` is 2–120 characters.
    - `trade` and `payType`: blank becomes `null`; otherwise the value must come from the list.
    - `experienceYears` is `optionalCode(/^\d{1,2}(\.\d)?$/, …)` turned into a number.
    - `payRate` is `optionalRupees()`, refined to at most `1000000`.
    - The pay-together check is a `superRefine` with the two messages from the test.
  - **List page:**
    - Heading `Workers`, a `New worker` button, and search with the placeholder `Name, mobile, trade or skill`.
    - The link `Show switched-off workers`, and `Show active workers` while viewing switched-off workers.
    - Columns: Worker, Trade, Mobile, Status.
    - Empty text:
      - `No workers yet. Add your first worker.` when there are none;
      - `No workers match “<q>”.` when a search finds nothing;
      - `No switched-off workers.` when there are no switched-off workers.
  - **Profile page:**
    - The full name as the heading, with the trade label under it.
    - An `Edit` link.
    - The details: Mobile and Other phone (`tel:` links), Address, Joining date, Experience (`5.5 years`), Wage (`wageText`), Skills, Emergency contact (`Sita Kumar · 9876500002`) and Notes. Empty details are skipped.
    - When switched off, the line `Switched off — not offered when adding to a project team.`
    - `<WorkerActiveToggle>` at the bottom, with the same buttons and confirmation as the customer toggle.
  - **Fixture:** `createTestWorker` inserts with the admin client. Workers have no number, so no login is needed.
- [ ] **Step 4: Run `npm test && npx playwright test workers && npm run typecheck && npm run lint`.** Expected: all pass.
- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "feat: add worker profiles with search, edit and switch off"
```

---

### Task 3: Worker documents

**Files:**
- Modify:
  - `src/modules/files/actions.ts`: `FILE_OWNERS` gains `worker`.
  - `src/modules/files/components/attachment-list.tsx`: an optional `hint` prop.
  - `src/app/(app)/workers/[id]/page.tsx`: a Documents section.
  - `tests/e2e/fixtures.ts` and `tests/e2e/project-files.spec.ts`: the shared test PDF.
- Test: `tests/e2e/worker-files.spec.ts`

**Interfaces:**
- Consumes: `listAttachments`, `<AttachmentList>`, `countStoredFiles` (stage 1); `getWorker` (Task 2).
- Produces:
  - **`FILE_OWNERS`:**
    - Its `table` type widens to `'projects' | 'workers'`.
    - A new entry: `worker: { table: 'workers', page: (id) => `/workers/${id}` }`.
  - **`<AttachmentList hint?: string … />`.** The default hint is the current text, `Drawings, site photos and documents. Photos are made smaller before upload; other files can be up to 10 MB.`
  - **Worker profile.** A `Documents` heading over `<AttachmentList entityType="worker" … hint="ID proof, certificates and photos. Photos are made smaller before upload; other files can be up to 10 MB." />`.
  - **`TEST_PDF: Buffer`** in `tests/e2e/fixtures.ts`. It moves there from `project-files.spec.ts`.

- [ ] **Step 1: Write the failing test.** First move the PDF buffer from `project-files.spec.ts` into `fixtures.ts` as `TEST_PDF`, and import it in `project-files.spec.ts`. Then:

```ts
// tests/e2e/worker-files.spec.ts
import { expect, test } from '@playwright/test'
import { OWNER, TEST_PDF, countStoredFiles, createTestWorker, login } from './fixtures'

test('keep a worker’s ID proof on their profile, then remove it', async ({ page }) => {
  const id = await createTestWorker({ fullName: 'Documents Test Worker' })
  await login(page, OWNER)
  await page.goto(`/workers/${id}`)
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible()
  await expect(page.getByText(/^ID proof, certificates and photos\./)).toBeVisible()

  await page.getByLabel('Add photo or file').setInputFiles({ name: 'Aadhaar card.pdf', mimeType: 'application/pdf', buffer: TEST_PDF })
  await expect(page.getByRole('link', { name: 'Aadhaar card.pdf' })).toBeVisible()
  await expect.poll(() => countStoredFiles(`worker/${id}`)).toBe(1)

  await page.getByRole('button', { name: 'Remove' }).click()
  await page.getByRole('button', { name: 'Yes, remove' }).click()
  await expect(page.getByText('No files yet.')).toBeVisible()
  await expect.poll(() => countStoredFiles(`worker/${id}`)).toBe(0)
})
```

- [ ] **Step 2: Run `npx playwright test worker-files project-files`.** Expected: `worker-files` FAILS, because there is no `Documents` heading. `project-files` still passes with the moved PDF.
- [ ] **Step 3: Implement the changes** listed under Interfaces. `recordAttachment` checks that the worker exists through `FILE_OWNERS`, as it already does for projects.
- [ ] **Step 4: Run `npx playwright test worker-files project-files && npm run typecheck && npm run lint`.** Expected: all pass.
- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "feat: keep workers' documents on their profile"
```

---

### Task 4: Project team

**Files:**
- Create:
  - Workers module: `src/modules/workers/team-queries.ts`, `src/modules/workers/team-actions.ts`, `src/modules/workers/components/add-to-team-form.tsx`, `src/modules/workers/components/team-list.tsx`.
  - Screen: `src/app/(app)/projects/[id]/team/page.tsx`.
- Modify:
  - `src/modules/workers/schema.ts`: the team schemas.
  - `src/modules/workers/labels.ts`: `workerOptionLabel`.
  - `src/app/(app)/projects/[id]/layout.tsx`: the Team tab.
  - `src/app/(app)/workers/[id]/page.tsx`: a Projects section.
  - `tests/e2e/fixtures.ts`.
- Test: `tests/unit/worker-labels.test.ts` (extended), `tests/e2e/project-team.spec.ts`

**Interfaces:**
- Consumes: everything from Task 2, `project_team_v` (Task 1), `getProject` (stage 1), and `todayIST` and `formatDate` (stage 0).
- Produces:
  - **Types.**
    - `type TeamPlace = { id; workerId; workerName; trade: Trade | null; workerPhone; workerIsActive: boolean; role; fromDate; toDate; isCurrent: boolean }`.
    - `type WorkerProject = { id; projectId; projectNo; projectTitle; projectStatus; role; fromDate; toDate; isCurrent }`.
    - `type WorkerOption = { id: string; name: string; trade: Trade | null; otherProjects: string[] }`. It is defined in `labels.ts`, so the unit test does not import the server-only `team-queries.ts`.
  - **In `team-queries.ts`:**
    - `listProjectTeam(projectId: string): Promise<TeamPlace[]>`: current places by worker name, then past places by `to_date`, newest first.
    - `countCurrentTeam(projectId: string): Promise<number>`.
    - `listWorkerOptions(projectId: string): Promise<WorkerOption[]>`: active workers not currently on this project, by name. Each option's `otherProjects` holds the `project_no` of every current place on another project that is not completed or cancelled.
    - `listWorkerProjects(workerId: string): Promise<WorkerProject[]>`: current places first, then past ones.
  - **In `labels.ts`:** `workerOptionLabel(o: WorkerOption): string`.
  - **In `schema.ts`:**
    - `teamPlaceSchema`: `workerId` is `z.guid('Choose a worker.')`, `role` is `optionalText(80)` and `fromDate` is `optionalDate()`.
    - `lastDaySchema`: `lastDay` is a required `YYYY-MM-DD`, with the message `Enter the last day.`
  - **Server actions in `team-actions.ts`:**
    - `addToTeam(projectId: string, input: unknown): Promise<ActionResult>`. It refuses a switched-off or missing worker with `This worker is switched off. Switch them on before adding them to a team.` It turns a unique-index clash (`23505`) into `<worker name> is already on this team.`
    - `endTeamPlace(placeId: string, input: unknown): Promise<ActionResult>`. When `lastDay` is before `from_date`, it returns the field error `lastDay: The last day cannot be before <DD-MM-YYYY>, when they joined the team.`
    - Both revalidate `/projects/<id>` (layout) and `/workers/<workerId>`.
  - **Team page `/projects/[id]/team`:**
    - `<AddToTeamForm>` has the labels Worker (a select of `workerOptionLabel`s), Role and From (default today), and the button `Add to team`. With no workers to offer, it shows `No more active workers to add.` and a link `Add a worker` to `/workers/new`.
    - `<TeamList>` shows two lists:
      - `aria-label="Current team"`. Each row has the name (a link to the worker), trade, role, `Since DD-MM-YYYY` and a `Switched off` tag when needed, plus a `Take off team` button. The button reveals a `Last day` date (default today) with `Confirm` and `Cancel`.
      - `aria-label="Earlier on this project"`. Each row shows its date range.
    - When nobody is on the team, the page says `No one on the team yet.`
  - **Project layout tab.** `Team` when nobody is on the team; `Team (n)` with the current count. It sits after Overview and before Files.
  - **Worker profile.** A `Projects` section that lists `listWorkerProjects`, or `Not on any project yet.` Each row shows the project number, the title (a link to the project), the role and the dates.
  - **Fixture `createTestProject(p: { customerId: string; title: string }): Promise<{ id: string; projectNo: string }>`.** It signs in as `OWNER` with the publishable key, because project numbering needs an active user (spec 4.4), and inserts the project.

- [ ] **Step 1: Write the failing tests.** Add to `tests/unit/worker-labels.test.ts`:

```ts
import { workerOptionLabel } from '@/modules/workers/labels'

it('names a worker in the team picker with their other current projects', () => {
  expect(workerOptionLabel({ id: 'x', name: 'Ramesh Kumar', trade: 'welder', otherProjects: [] })).toBe('Ramesh Kumar · Welder')
  expect(workerOptionLabel({ id: 'x', name: 'Ramesh Kumar', trade: 'welder', otherProjects: ['PRJ/2026-27/0003', 'PRJ/2026-27/0007'] }))
    .toBe('Ramesh Kumar · Welder · also on PRJ/2026-27/0003, PRJ/2026-27/0007')
  expect(workerOptionLabel({ id: 'x', name: 'Imran', trade: null, otherProjects: [] })).toBe('Imran')
})
```

```ts
// tests/e2e/project-team.spec.ts
import { expect, test, type Page } from '@playwright/test'
import { OWNER, createTestCustomer, createTestProject, createTestWorker, login } from './fixtures'

const teamTab = (page: Page) => page.getByRole('navigation', { name: 'Project sections' }).getByRole('link', { name: /^Team/ })
const istDay = (offset: number) => new Date(Date.now() + 5.5 * 3600_000 + offset * 86_400_000).toISOString().slice(0, 10)
const ddmmyyyy = (iso: string) => iso.split('-').reverse().join('-')

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('build a project team and see it on the worker’s profile', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Team Test Customer' })
  const shed = await createTestProject({ customerId, title: 'Team test shed' })
  const gate = await createTestProject({ customerId, title: 'Team test gate' })
  const ramesh = await createTestWorker({ fullName: 'Team Ramesh', trade: 'welder' })
  await createTestWorker({ fullName: 'Team Off Worker', trade: 'helper', status: 'inactive' })

  await page.goto(`/projects/${gate.id}/team`)
  await page.getByLabel('Worker').selectOption({ label: 'Team Ramesh · Welder' })
  await page.getByRole('button', { name: 'Add to team' }).click()
  await expect(teamTab(page)).toHaveText('Team (1)')

  await page.goto(`/projects/${shed.id}`)
  await teamTab(page).click()
  await expect(page.getByText('No one on the team yet.')).toBeVisible()
  const picker = page.getByLabel('Worker')
  await expect(picker.getByRole('option', { name: /Team Off Worker/ })).toHaveCount(0)
  await picker.selectOption({ label: `Team Ramesh · Welder · also on ${gate.projectNo}` })
  await page.getByLabel('Role').fill('Lead welder')
  await page.getByRole('button', { name: 'Add to team' }).click()

  const current = page.getByRole('list', { name: 'Current team' })
  await expect(current.getByRole('listitem').filter({ hasText: 'Team Ramesh' })).toContainText('Lead welder')
  expect((await current.getByRole('link', { name: 'Team Ramesh' }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await expect(teamTab(page)).toHaveText('Team (1)')
  await expect(picker.getByRole('option', { name: /Team Ramesh/ })).toHaveCount(0)

  await page.goto(`/workers/${ramesh}`)
  await expect(page.getByRole('link', { name: 'Team test shed' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Team test gate' })).toBeVisible()
})

test('take a worker off the team; a last day before they joined is refused', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Team End Customer' })
  const project = await createTestProject({ customerId, title: 'Team end shed' })
  await createTestWorker({ fullName: 'Team Leaving Worker', trade: 'fitter' })
  const joins = istDay(3)

  await page.goto(`/projects/${project.id}/team`)
  await page.getByLabel('Worker').selectOption({ label: 'Team Leaving Worker · Fitter' })
  await page.getByLabel('From').fill(joins)
  await page.getByRole('button', { name: 'Add to team' }).click()

  const row = page.getByRole('list', { name: 'Current team' }).getByRole('listitem').filter({ hasText: 'Team Leaving Worker' })
  await row.getByRole('button', { name: 'Take off team' }).click()
  await expect(row.getByLabel('Last day')).toHaveValue(istDay(0))
  await row.getByRole('button', { name: 'Confirm' }).click()
  await expect(row.getByText(`The last day cannot be before ${ddmmyyyy(joins)}, when they joined the team.`)).toBeVisible()

  await row.getByLabel('Last day').fill(joins)
  await row.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByRole('list', { name: 'Earlier on this project' })).toContainText('Team Leaving Worker')
  await expect(teamTab(page)).toHaveText('Team')
})

test('adding the same worker from two screens puts them on the team once', async ({ page, context }) => {
  const customerId = await createTestCustomer({ name: 'Team Twice Customer' })
  const project = await createTestProject({ customerId, title: 'Team twice shed' })
  await createTestWorker({ fullName: 'Team Twice Worker', trade: 'painter' })
  const other = await context.newPage()

  for (const p of [page, other]) {
    await p.goto(`/projects/${project.id}/team`)
    await p.getByLabel('Worker').selectOption({ label: 'Team Twice Worker · Painter' })
  }
  await page.getByRole('button', { name: 'Add to team' }).click()
  await expect(teamTab(page)).toHaveText('Team (1)')
  await other.getByRole('button', { name: 'Add to team' }).click()
  await expect(other.getByText('Team Twice Worker is already on this team.')).toBeVisible()

  await other.reload()
  await expect(other.getByRole('list', { name: 'Current team' }).getByRole('listitem')).toHaveCount(1)
})

test('a worker switched off later stays on the team, marked switched off', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Team Off Customer' })
  const project = await createTestProject({ customerId, title: 'Team off shed' })
  const worker = await createTestWorker({ fullName: 'Team Later Off', trade: 'helper' })

  await page.goto(`/projects/${project.id}/team`)
  await page.getByLabel('Worker').selectOption({ label: 'Team Later Off · Helper' })
  await page.getByRole('button', { name: 'Add to team' }).click()

  await page.goto(`/workers/${worker}`)
  await page.getByRole('button', { name: 'Switch off' }).click()
  await page.getByRole('button', { name: 'Yes, switch off' }).click()

  await page.goto(`/projects/${project.id}/team`)
  const row = page.getByRole('list', { name: 'Current team' }).getByRole('listitem').filter({ hasText: 'Team Later Off' })
  await expect(row).toContainText('Switched off')
  await expect(page.getByLabel('Worker').getByRole('option', { name: /Team Later Off/ })).toHaveCount(0)
})
```

- [ ] **Step 2: Run `npm test`, then `npx playwright test project-team`.** Expected: the new unit test and `project-team.spec.ts` FAIL, because `workerOptionLabel` and `createTestProject` do not exist and there is no Team tab.
- [ ] **Step 3: Implement the queries, actions, components, Team page, layout tab, profile section and fixture** listed under Interfaces.
  - **Reads:** all of them come from `project_team_v`.
  - **`addToTeam`:**
    1. It reads the worker's name and status from `workers`.
    2. It inserts into `project_workers`.
    3. When the insert fails with `23505`, it returns the "already on this team" message.
  - **`endTeamPlace`:**
    1. It reads the place's `from_date` and `worker_id` first.
    2. It checks the last day against `from_date`, then updates `to_date`.
- [ ] **Step 4: Run `npm test && npx playwright test project-team workers && npm run typecheck && npm run lint`.** Expected: all pass.
- [ ] **Step 5: Run the whole suite: `npm test && npm run test:db && npm run test:e2e`.** Expected: every test passes, including stages 0 and 1.
- [ ] **Step 6: Commit.**

```bash
git add -A && git commit -m "feat: add project teams with the worker picker and team history"
```

---

## Stage 2 done when

- All tests pass: `npm test`, `npm run test:db`, `npm run test:e2e`, `npm run lint` and `npm run typecheck`.
- The owner checks on `localhost`:
  - workers are entered;
  - a document is kept on a profile;
  - a project page shows its team;
  - a worker's profile shows their projects.

  The phone check comes after the last stage, as the owner decided on 26-10-2026.
