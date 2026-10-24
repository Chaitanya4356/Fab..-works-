# Stage 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SteelFlow's foundation: a phone-first Next.js app where staff log in, manage each other's logins, and fill in workshop Settings. It runs on a Supabase database with audit history, financial-year document numbering, private file storage, nightly encrypted backups, and Test/Live deployments on Vercel.

**Architecture:** A modular monolith.
- Next.js App Router pages and server actions talk to Supabase as the logged-in user, so Row Level Security applies everywhere.
- Multi-row or protected writes are `SECURITY DEFINER` Postgres functions.
- Files go straight from the browser to a private Storage bucket using signed upload URLs.
- `src/proxy.ts` refreshes the session on every request. Every page and action still checks for an active user itself.

**Tech Stack:** Next.js 16.4 (App Router, `src/`, Turbopack), React 19, TypeScript (strict), Tailwind CSS 4, Supabase (Postgres, Auth, Storage) with `@supabase/supabase-js` 2.x and `@supabase/ssr` 0.12, Zod 4, Vitest 5, pgTAP via `supabase test db`, Playwright 1.64, Supabase CLI 2.x as a dev dependency, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-24-steelflow-design.md`. Read sections 2, 4, 6.1, 6.2 (Setup and shared), 6.5 and 9 (stage 0) before starting.

## Global Constraints

- Node 24 and npm. Commands below are for Git Bash, run from the repo root `/d/fabrication-web/Fab..-works-`. Docker Desktop must be running for any `supabase` command.
- Next.js 16 uses **`src/proxy.ts` exporting `proxy`**. Never create `middleware.ts`.
- Environment variable names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`.
  - The secret key is read only in files that start with `import 'server-only'`.
  - `.env.local` is never committed.
- Authorization checks use `supabase.auth.getClaims()`, never `getSession()`.
- Every table has RLS on, and access goes through `public.is_active_user()`. There are no delete policies, except on `attachments` (spec 6.5).
- Every business table gets the `set_row_meta` trigger (`created_at`, `created_by`, `updated_at`, `updated_by`). Audited tables also get the `audit_row` trigger.
- `SECURITY DEFINER` functions use `set search_path = ''`, refer to every object with its schema, revoke `execute` from `public` and `anon`, and grant it to `authenticated`.
- **Formats:**
  - "Today" is the Asia/Kolkata date.
  - Displayed dates are `DD-MM-YYYY`.
  - Money is `₹` with en-IN grouping, e.g. `₹1,00,000.00`.
  - Document numbers follow each type's row in `doc_number_formats` (spec 7.11). The defaults give `INV/2026-27/0001` and so on, restarting every 1 April. The TypeScript preview (`formatDocNumber`) and SQL (`next_doc_number`) must give identical results.
- **Files:**
  - Private bucket `files` with a 10 MB limit.
  - Images are shrunk to at most 1600 px on the long side, as JPEG at quality 0.75. The logo is shrunk to 600 px.
  - Signed view URLs last 600 seconds.
- **Copy:** plain language. The unexpected-error message is exactly `Something went wrong. Nothing was saved. Try again.` (spec 4.10).
- **Logins:** no public sign-up and no emails. Users are created and reset by other users.
- **Screens:** touch targets at least 44 px. Below 768 px wide there is a bottom bar with Home, Projects, Quotes, Money and More; at 768 px and wider, a side menu. The theme is light only.
- **Test credentials** live only in `tests/e2e/fixtures.ts` and `supabase/seed.sql`, for local use.

**Spec clarifications made in this plan:**
- `audit_log.record_id` is `text`, not `uuid`, so the settings row (id `1`) can be logged.
- The `attachments` table, the bucket and the upload pipeline are built here. The attachment list and "record attachment" UI arrive in stage 1, with the first screen that owns files.
- The restore *rehearsal* is done locally in Task 9. The restore test against Live stays at Milestone A.

## Review Focus

1. **Numbering changed mid-year, or numbers outgrowing their digits,** must never repeat a number or cut it short. A next number set over numbers already used is refused, and with 3 digits 999 is followed by 1000. Tests: Task 3, `the next number cannot go back over used numbers` and `numbers outgrow their digits instead of being cut short`.
2. **Anything done between midnight and 05:30 IST** (still the previous day in UTC) must use the India date for "today", for displayed dates and for the financial year. Tests: Task 1, `todayIST` and `formatDate` cases at 18:29Z and 18:30Z.
3. **Switching off your own login, or a switched-off user who still has the app open,** must be refused, or sent to the login screen on their next page load. Otherwise a workshop could lock itself out, or a former employee could keep access. Tests: Task 6, pgTAP `cannot switch off yourself`, and e2e `switching a user off ends their access, even mid-session`.
4. **Very large or HEIC phone photos** must be shrunk before upload, or refused with a clear message, never a crash or a 10 MB rejection. Tests: Task 7, `validateFile` cases; Task 8, e2e `a large logo is shrunk before upload`.
5. **Sloppily typed Settings** (lower-case IFSC/GSTIN, blank optional fields, a GSTIN from another state) must be tidied up or answered with a clear field message, never stored as empty-string junk or saved wrongly. Tests: Task 8, `settingsSchema` cases.

---

### Task 1: Scaffold the app and calculation helpers

**Files:**
- Create via the scaffolder, then copy into the repo: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `next-env.d.ts`, `AGENTS.md`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/favicon.ico`, `public/*`
- Create: `vitest.config.ts`, `src/lib/format.ts`, `src/lib/dates.ts`, `src/lib/fy.ts`, `.env.example`
- Modify: `README.md` (replaced by the scaffolder, then rewritten), `AGENTS.md` (add a SteelFlow section), `.gitignore`
- Test: `tests/unit/format.test.ts`, `tests/unit/dates.test.ts`, `tests/unit/fy.test.ts`

**Interfaces:**
- Produces:
  - `formatINR(amount: number | string): string`
  - `formatDate(value: Date | string): string` (`DD-MM-YYYY`, India date)
  - `formatBytes(bytes: number): string`
  - `todayIST(now?: Date): string` (`YYYY-MM-DD`)
  - `financialYear(isoDate: string): string` (e.g. `2026-27`)
- npm scripts used by every later task: `dev`, `build`, `lint`, `typecheck`, `test`, `test:db`, `test:e2e`, `db:types`.

- [ ] **Step 1: Scaffold in a temporary folder and copy it in.** The repo folder name is not a valid npm package name, and the scaffolder refuses to run next to an existing `README.md`.

```bash
cd "$TEMP" && rm -rf steelflow && npx --yes create-next-app@16.4.3 steelflow --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --skip-install --disable-git --no-agent-feedback --yes
cp -r "$TEMP/steelflow/." /d/fabrication-web/Fab..-works-/ && cd /d/fabrication-web/Fab..-works-
rm public/*.svg
```

- [ ] **Step 2: Set up `package.json` and install.**
  - Set `"name": "steelflow"` and `"engines": { "node": ">=24" }`.
  - Add these scripts: `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:db": "supabase db reset && supabase test db"` (database tests assume a freshly reset database), `"test:e2e": "supabase db reset && playwright test"`, `"db:types": "supabase gen types typescript --local > src/lib/supabase/database.types.ts"`.
  - Run:

```bash
npm install && npm install -D vitest@^5.0.5 @types/node@^24
```

- [ ] **Step 3: Create `vitest.config.ts`.** It uses `test.include = ['tests/unit/**/*.test.ts']`, `environment: 'node'`, and a `resolve.alias` mapping `@` to `src`.
- [ ] **Step 4: Write the failing tests.**

```ts
// tests/unit/format.test.ts
import { describe, expect, it } from 'vitest'
import { formatBytes, formatDate, formatINR } from '@/lib/format'

describe('formatINR', () => {
  it('uses Indian digit grouping with paise', () => {
    expect(formatINR(100000)).toBe('₹1,00,000.00')
    expect(formatINR(5443.5)).toBe('₹5,443.50')
    expect(formatINR(23550075.5)).toBe('₹2,35,50,075.50')
    expect(formatINR('57300')).toBe('₹57,300.00')
    expect(formatINR(0)).toBe('₹0.00')
  })
  it('shows negative amounts with a minus sign', () => {
    expect(formatINR(-286.5)).toBe('-₹286.50')
  })
})

describe('formatDate', () => {
  it('formats calendar dates without shifting them', () => {
    expect(formatDate('2026-10-24')).toBe('24-10-2026')
  })
  it('turns instants into the India date', () => {
    expect(formatDate('2027-03-31T18:30:00Z')).toBe('01-04-2027')
    expect(formatDate(new Date('2027-03-31T18:29:00Z'))).toBe('31-03-2027')
  })
})

describe('formatBytes', () => {
  it('uses B, KB, MB and GB', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(12.3 * 1024 * 1024)).toBe('12.3 MB')
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB')
  })
})
```

```ts
// tests/unit/dates.test.ts
import { expect, it } from 'vitest'
import { todayIST } from '@/lib/dates'

it('uses the India date, which starts at 18:30 UTC', () => {
  expect(todayIST(new Date('2027-03-31T18:29:00Z'))).toBe('2027-03-31')
  expect(todayIST(new Date('2027-03-31T18:30:00Z'))).toBe('2027-04-01')
})
```

```ts
// tests/unit/fy.test.ts
import { expect, it } from 'vitest'
import { financialYear } from '@/lib/fy'

it('starts the financial year on 1 April', () => {
  expect(financialYear('2026-04-01')).toBe('2026-27')
  expect(financialYear('2027-03-31')).toBe('2026-27')
  expect(financialYear('2027-04-01')).toBe('2027-28')
  expect(financialYear('2099-04-01')).toBe('2099-00')
})
it('only accepts YYYY-MM-DD', () => {
  expect(() => financialYear('31-03-2027')).toThrow('Expected a date as YYYY-MM-DD')
})
```

- [ ] **Step 5: Run `npm test`.** Expected: FAIL (modules not found).
- [ ] **Step 6: Implement the helpers.**
  - `src/lib/format.ts`:
    - `formatINR` uses `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
    - `formatDate` passes a `YYYY-MM-DD` string through as a calendar date and formats anything else in `Asia/Kolkata`.
    - `formatBytes` uses 1024 steps, with one decimal from KB upward.
  - `src/lib/dates.ts`: `todayIST` uses `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })`.
  - `src/lib/fy.ts`: `financialYear` throws on any other format.
- [ ] **Step 7: Run `npm test && npm run lint && npm run typecheck && npm run build`.** Expected: all pass.
- [ ] **Step 8: Housekeeping.**
  - Add `!.env.example`, `/test-results/` and `/playwright-report/` to `.gitignore`.
  - Write `.env.example` with the three variable names, using `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and blank keys.
  - Replace `README.md` with: the project name; one paragraph on what SteelFlow is; how to run it locally (`npx supabase start`, copy keys into `.env.local`, `npm run dev`); the test commands; and links to the spec and this plan.
  - Append a `## SteelFlow` section to `AGENTS.md`:
    - Point to the spec and plans folders.
    - Say to use `proxy.ts`, not middleware.
    - Say to use `getClaims()` for auth checks.
    - Say to run `npm run db:types` after any migration.
    - Say the database tests are in `supabase/tests`.
- [ ] **Step 9: Commit.**

```bash
git add -A && git commit -m "feat: scaffold Next.js app with Indian format and date helpers"
```

---

### Task 2: Local Supabase, profiles, row metadata and audit history

**Files:**
- Create: `supabase/config.toml` (via `supabase init`), `supabase/migrations/20261024000001_profiles_audit.sql`, `supabase/seed.sql`, `src/lib/supabase/database.types.ts` (generated)
- Test: `supabase/tests/database/01_profiles_audit.test.sql`

**Interfaces:**
- Produces, in SQL:
  - Table `public.profiles`.
  - `public.is_active_user() returns boolean`.
  - Trigger function `public.set_row_meta()`.
  - Table `public.audit_log`, with `record_id text`.
  - Trigger function `public.audit_row()`.
  - Trigger `on_auth_user_created` on `auth.users`, calling `public.handle_new_user()`.
- Produces test helpers, in `seed.sql`, schema `tests`, local only:
  - `tests.create_user(p_id uuid, p_email text, p_full_name text, p_phone text default null) returns uuid`
  - `tests.authenticate_as(p_user uuid) returns void`
  - `tests.clear_authentication() returns void`

- [ ] **Step 1: Install and initialise the Supabase CLI.**
  - Run:

```bash
npm install -D supabase@^2.122.0 && npx supabase init
```

    Answer **N** to the editor-settings prompts.
  - In `supabase/config.toml`, set:
    - `project_id = "steelflow"`
    - `[auth] enable_signup = false`
    - `[auth.email] enable_signup = false` and `enable_confirmations = false`
  - Then run:

```bash
npx supabase start
```

  - Copy the API URL, the **Publishable** key and the **Secret** key from its output into `.env.local`.

- [ ] **Step 2: Write `supabase/seed.sql` with the `tests` helpers.**
  - **`create_user`** inserts into `auth.users` with:
    - `instance_id = '00000000-0000-0000-0000-000000000000'`
    - `aud = role = 'authenticated'`
    - `encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf'))`
    - `email_confirmed_at = now()`
    - `raw_app_meta_data = '{"provider":"email","providers":["email"]}'`
    - `raw_user_meta_data = {full_name, phone}`
    - The token columns (`confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`) set to `''`, because Supabase Auth fails on NULLs there.
    
    It also inserts the matching `auth.identities` row (`provider = 'email'`, `provider_id = id::text`, `identity_data = {sub, email}`).
  - **`authenticate_as`** calls `set_config('role','authenticated',true)` and `set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true)`.
  - **`clear_authentication`** sets the role back to `postgres` and the claims to `''`.
  - Finally, revoke usage on schema `tests` from `anon` and `authenticated`.

- [ ] **Step 3: Write the failing test.**

```sql
-- supabase/tests/database/01_profiles_audit.test.sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao', '9876543210');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');

select results_eq(
  $$ select full_name, phone, login_email, is_active from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('Asha Rao'::text, '9876543210'::text, 'asha@steelflow.test'::text, true) $$,
  'a new login gets a profile from its details');

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select ok(public.is_active_user(), 'an active user is active');
select results_eq(
  $$ update public.profiles set full_name = 'Ravi K' where id = '22222222-2222-2222-2222-222222222222' returning updated_by $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'changes record who made them');
select throws_ok($$ update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'users cannot switch logins off directly');
select throws_ok($$ insert into public.audit_log (table_name, record_id, action) values ('x', '1', 'INSERT') $$,
  '42501', null, 'nobody can write the audit log directly');
select throws_ok($$ delete from public.audit_log $$, '42501', null, 'nobody can delete audit history');
select tests.clear_authentication();

select results_eq(
  $$ select changed_by, old_values->>'full_name', new_values->>'full_name' from public.audit_log
     where table_name = 'profiles' and record_id = '22222222-2222-2222-2222-222222222222' and action = 'UPDATE' $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid, 'Ravi Kumar'::text, 'Ravi K'::text) $$,
  'profile changes are in the audit log');

update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';
select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select ok(not public.is_active_user(), 'a switched-off user is not active');
select is_empty($$ select id from public.profiles $$, 'a switched-off user sees nothing');
select tests.clear_authentication();
select ok(not public.is_active_user(), 'nobody logged in is not active');

select * from finish();
rollback;
```

- [ ] **Step 4: Run `npx supabase test db`.** Expected: FAIL (`relation "public.profiles" does not exist`).
- [ ] **Step 5: Write the migration `20261024000001_profiles_audit.sql`.**
  - **`profiles`:** columns as in spec 6.2, plus `created_at`, `created_by`, `updated_at` and `updated_by`.
  - **`handle_new_user()`:** a `security definer` trigger, `after insert on auth.users`. It sets:
    - `full_name = coalesce(meta->>'full_name', email)`
    - `phone = meta->>'phone'`
    - `login_email = email`
    - `created_by = (meta->>'created_by')::uuid`, so the server action can record who added the user.
  - **`is_active_user()`:** `stable security definer`. Returns true when a profile exists with `id = auth.uid()` and `is_active`.
  - **`set_row_meta()`:**
    - On INSERT: sets `created_at`, `updated_at` to `now()`, and `created_by`, `updated_by` to `auth.uid()` (keeping a `created_by` already provided when `auth.uid()` is null).
    - On UPDATE: keeps the old `created_*` values and refreshes `updated_*`.
  - **`audit_log`:** columns as in spec 6.2, but with `record_id text`.
  - **`audit_row()`:** `security definer`. Writes `coalesce(new.id, old.id)::text`, `TG_OP`, `auth.uid()`, `now()` and `to_jsonb(old/new)`. It skips an UPDATE whose old and new JSON are equal.
  - **Triggers on `profiles`:** `set_row_meta` (before insert or update) and `audit_row` (after insert, update or delete).
  - **Policies:**
    - `profiles`: select, and update `using/with check (public.is_active_user())`.
    - `audit_log`: select only.
  - **Grants:**
    - `revoke all on public.profiles, public.audit_log from anon`
    - `revoke insert, update, delete on public.profiles, public.audit_log from authenticated`
    - `grant update (full_name, phone) on public.profiles to authenticated`
- [ ] **Step 6: Run `npx supabase db reset && npx supabase test db`.** Expected: `01_profiles_audit ... ok`, 10 of 10 tests passing.
- [ ] **Step 7: Run `npm run db:types && npm run typecheck`.** Expected: pass.
- [ ] **Step 8: Commit.**

```bash
git add -A && git commit -m "feat: add profiles, row metadata and audit history"
```

---

### Task 3: Settings and financial-year document numbers

**Files:**
- Create: `supabase/migrations/20261024000002_settings_numbers.sql`
- Modify: `src/lib/supabase/database.types.ts` (regenerated)
- Test: `supabase/tests/database/02_settings_numbers.test.sql`

**Interfaces:**
- Consumes: `is_active_user()`, `set_row_meta()`, `audit_row()` and the `tests.*` helpers (Task 2).
- Produces:
  - Table `public.settings`: a single row with `id = 1`, columns as in spec 6.2. `workshop_name text not null default ''`.
  - Table `public.doc_number_formats` (spec 6.2), with the common columns and the five default rows. It also has an `id uuid` primary key, so `audit_row` can log it.
  - Table `public.doc_counters` (spec 6.2), readable by active users.
  - `public.financial_year(p_date date) returns text`, which is immutable.
  - `public.today_ist() returns date`.
  - `public.next_doc_number(p_doc_type text, p_doc_date date) returns text`. `p_doc_type` is one of `project`, `quotation`, `invoice`, `dispatch` or `po`. Callers pass the India date (`todayIST()` or the document's date).
  - `public.save_doc_number_formats(p_formats jsonb, p_as_of date) returns void`. `p_formats` is an array of `{ doc_type, prefix, separator, year_style, digits, next_number? }`. Types left out are unchanged, and a missing `next_number` leaves that counter alone.

- [ ] **Step 1: Write the failing test.**

```sql
-- supabase/tests/database/02_settings_numbers.test.sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);
select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');
update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';

select results_eq(
  $$ select gst_enabled, default_gst_rate, default_margin_percent from public.settings $$,
  $$ values (false, 18.00::numeric(5,2), 15.00::numeric(5,2)) $$,
  'one settings row with GST off');
select throws_ok($$ insert into public.settings (id) values (2) $$, '23514', null, 'there is only ever one settings row');
select results_eq(
  $$ select doc_type, prefix, separator, year_style, digits from public.doc_number_formats order by doc_type $$,
  $$ values ('dispatch'::text, 'DN'::text, '/'::text, 'full'::text, 4::smallint),
            ('invoice', 'INV', '/', 'full', 4), ('po', 'PO', '/', 'full', 4),
            ('project', 'PRJ', '/', 'full', 4), ('quotation', 'QT', '/', 'full', 4) $$,
  'every document type starts with the default format');
select is(public.financial_year('2027-03-31'), '2026-27', '31 March belongs to the year that began the April before');
select is(public.financial_year('2027-04-01'), '2027-28', 'the year restarts on 1 April');

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select is(public.next_doc_number('invoice', '2027-03-31'), 'INV/2026-27/0001', 'E12: first invoice number of 2026-27');
select is(public.next_doc_number('invoice', '2027-03-31'), 'INV/2026-27/0002', 'numbers go up by one');
select is(public.next_doc_number('invoice', '2027-04-01'), 'INV/2027-28/0001', 'E12: numbering restarts on 1 April');
select is(public.next_doc_number('project', '2026-10-24'), 'PRJ/2026-27/0001', 'each document type has its own sequence');
select throws_ok($$ select public.next_doc_number('receipt', '2026-10-24') $$, 'P0001', 'Unknown document type: receipt', 'unknown document types are refused');
select throws_ok($$ insert into public.doc_counters (doc_type, series, last_number) values ('invoice', '2030-31', 5) $$, '42501', null, 'counters cannot be written directly');
select throws_ok($$ update public.doc_number_formats set prefix = 'X' $$, '42501', null, 'formats change only through save_doc_number_formats');
select results_eq($$ update public.settings set workshop_name = 'Sri Balaji Fabricators' returning updated_by $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$, 'an active user can update settings');

select lives_ok($$ select public.save_doc_number_formats('[
    {"doc_type": "invoice", "prefix": "sbf", "separator": "/", "year_style": "full", "digits": 3, "next_number": 246},
    {"doc_type": "quotation", "prefix": "SBF-Q", "separator": "-", "year_style": "short", "digits": 4},
    {"doc_type": "po", "prefix": "PO", "separator": "/", "year_style": "none", "digits": 4, "next_number": 1}
  ]', '2026-10-24') $$, 'formats and next numbers can be saved together');
select is(public.next_doc_number('invoice', '2026-10-24'), 'SBF/2026-27/246', 'E14: invoices carry on from the chosen next number');
select is(public.next_doc_number('invoice', '2026-10-25'), 'SBF/2026-27/247', 'E14: and keep counting');
select is(public.next_doc_number('quotation', '2026-10-24'), 'SBF-Q-26-27-0001', 'E14: short year and a hyphen separator');
select throws_ok($$ select public.save_doc_number_formats('[{"doc_type": "invoice", "prefix": "SBF", "separator": "/", "year_style": "full", "digits": 3, "next_number": 200}]', '2026-10-24') $$,
  'P0001', 'Invoice numbers up to 247 have already been used. The next number must be 248 or higher.',
  'the next number cannot go back over used numbers');
select lives_ok($$ select public.save_doc_number_formats('[{"doc_type": "dispatch", "prefix": "DN", "separator": "/", "year_style": "full", "digits": 4, "next_number": 5000}]', '2026-10-24') $$,
  'a next number can be set high');
select lives_ok($$ select public.save_doc_number_formats('[{"doc_type": "dispatch", "prefix": "DN", "separator": "/", "year_style": "full", "digits": 4, "next_number": 1}]', '2026-10-24') $$,
  'and lowered again before anything uses it');
select is(public.next_doc_number('dispatch', '2026-10-24'), 'DN/2026-27/0001', 'so the first delivery note is 0001');
select is(public.next_doc_number('po', '2027-03-31'), 'PO/0001', 'E14: a format without a year');
select is(public.next_doc_number('po', '2027-04-01'), 'PO/0002', 'E14: carries on across April instead of restarting');
select throws_ok($$ select public.save_doc_number_formats('[{"doc_type": "quotation", "prefix": "sbf", "separator": "/", "year_style": "full", "digits": 4}]', '2026-10-24') $$,
  'P0001', 'Each document type needs its own prefix.', 'two document types cannot share a prefix');
select tests.clear_authentication();

update public.doc_counters set last_number = 998 where doc_type = 'invoice' and series = '2026-27';
select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select is(public.next_doc_number('invoice', '2026-10-24'), 'SBF/2026-27/999', 'three digits up to 999');
select is(public.next_doc_number('invoice', '2026-10-24'), 'SBF/2026-27/1000', 'numbers outgrow their digits instead of being cut short');

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.next_doc_number('invoice', '2027-04-01') $$, '42501', 'You need an active login to do this.', 'switched-off users cannot take numbers');
select throws_ok($$ select public.save_doc_number_formats('[]', '2026-10-24') $$, '42501', 'You need an active login to do this.', 'switched-off users cannot change number formats');
select is_empty($$ update public.settings set workshop_name = 'X' returning 1 $$, 'switched-off users cannot change settings');
select tests.clear_authentication();

select results_eq(
  $$ select new_values->>'workshop_name' from public.audit_log where table_name = 'settings' and action = 'UPDATE' order by id limit 1 $$,
  $$ values ('Sri Balaji Fabricators'::text) $$, 'settings changes are in the audit log');
select results_eq(
  $$ select new_values->>'prefix' from public.audit_log where table_name = 'doc_number_formats' and action = 'UPDATE' and new_values->>'doc_type' = 'invoice' order by id limit 1 $$,
  $$ values ('SBF'::text) $$, 'number format changes are in the audit log');

select * from finish();
rollback;
```

- [ ] **Step 2: Run `npx supabase test db`.** Expected: `02_settings_numbers` FAILS (relation missing). `01` still passes.
- [ ] **Step 3: Write the migration `20261024000002_settings_numbers.sql`.**
  - **`settings`:**
    - `id smallint primary key default 1 check (id = 1)`, then `insert into public.settings default values`.
    - Triggers `set_row_meta` and `audit_row`.
    - Policies for select and update `using/with check (public.is_active_user())`.
    - Grants: `revoke insert, delete, update on public.settings from authenticated, anon`, then `grant update (<every column except id and the created_*/updated_* columns>) on public.settings to authenticated`.
  - **`doc_number_formats`:**
    - Columns as in spec 6.2, plus `id uuid` and the common columns.
    - Check constraints on `prefix` (`^[A-Z0-9][A-Z0-9/-]{0,9}$`), `separator`, `year_style` and `digits` (1–8), plus a unique index on `upper(prefix)`.
    - Insert the five default rows.
    - Triggers `set_row_meta` and `audit_row`.
    - A select policy for active users; `revoke insert, update, delete … from anon, authenticated`.
  - **`doc_counters`:** columns as in spec 6.2. RLS on, with a select policy for active users. `revoke insert, update, delete … from anon, authenticated`.
  - **`financial_year`:** returns `YYYY-YY`, where the year starts on 1 April.
  - **`today_ist`:** `(now() at time zone 'Asia/Kolkata')::date`.
  - **`next_doc_number`:** `security definer`. It:
    1. Raises `You need an active login to do this.` with errcode `42501` unless `is_active_user()`.
    2. Reads the type's format (no row → raise `Unknown document type: %`).
    3. Uses series `all` when the year style is none, otherwise `financial_year(p_doc_date)`.
    4. Increments the counter atomically with `insert … on conflict (doc_type, series) do update set last_number = doc_counters.last_number + 1, highest_issued = greatest(doc_counters.highest_issued, doc_counters.last_number + 1) returning last_number`. A new row starts with `last_number = highest_issued = 1`.
    5. Returns `concat_ws(separator, prefix, year_part, lpad(n::text, greatest(digits, length(n::text)), '0'))`, where `year_part` is the full year, `substr(fy, 3)` for the short style, or null for none.
  - **`save_doc_number_formats`:** `security definer`, with the same active-user check. For each item it:
    1. Upper-cases the prefix. If another type already uses it, it refuses with `Each document type needs its own prefix.` (`P0001`).
    2. Updates the format row.
    3. When `next_number` is given, works out the series from the new year style and `p_as_of`.
       - If `next_number <= highest_issued`, it refuses with `{Label} numbers up to {highest_issued} have already been used. The next number must be {highest_issued + 1} or higher.` The labels are Project, Quotation, Invoice, Delivery note and Purchase order.
       - Otherwise it upserts `last_number = next_number - 1`, keeping `highest_issued`.
  - **Grants:** execute on `financial_year`, `today_ist`, `next_doc_number` and `save_doc_number_formats` to `authenticated`.
- [ ] **Step 4: Run `npx supabase db reset && npx supabase test db`.** Expected: `01` and `02` both pass.
- [ ] **Step 5: Run `npm run db:types && npm run typecheck`.** Expected: pass.
- [ ] **Step 6: Commit.**

```bash
git add -A && git commit -m "feat: add settings and financial-year document numbering"
```

---

### Task 4: Attachments and private file storage

**Files:**
- Create: `supabase/migrations/20261024000003_attachments_storage.sql`
- Modify: `src/lib/supabase/database.types.ts` (regenerated)
- Test: `supabase/tests/database/03_attachments_storage.test.sql`

**Interfaces:**
- Consumes: the Task 2 helpers and triggers.
- Produces:
  - Table `public.attachments`. `entity_type` is checked against the spec 6.2 list: `customer`, `supplier`, `worker`, `project`, `quotation`, `activity_update`, `purchase_bill`, `dispatch`, `expense`.
  - Bucket `files`.
  - `public.storage_usage() returns table (files_bytes bigint, database_bytes bigint)`.

- [ ] **Step 1: Write the failing test.**

```sql
-- supabase/tests/database/03_attachments_storage.test.sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);
select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');
update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';

select results_eq($$ select public, file_size_limit from storage.buckets where id = 'files' $$,
  $$ values (false, 10485760::bigint) $$, 'the files bucket is private with a 10 MB limit');

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ insert into public.attachments (entity_type, entity_id, file_path, file_name, mime_type, size_bytes)
  values ('project', '33333333-3333-3333-3333-333333333333', 'project/33333333-3333-3333-3333-333333333333/a1-shed-ga.pdf', 'Shed GA.pdf', 'application/pdf', 2048) $$,
  'an active user can record an attachment');
select throws_ok($$ insert into public.attachments (entity_type, entity_id, file_path) values ('invoice_x', '33333333-3333-3333-3333-333333333333', 'x/y') $$,
  '23514', null, 'unknown attachment types are refused');
select lives_ok($$ insert into storage.objects (bucket_id, name, metadata)
  values ('files', 'project/33333333-3333-3333-3333-333333333333/a1-shed-ga.pdf', '{"size": 2048}') $$,
  'an active user can store a file');
select results_eq($$ select files_bytes from public.storage_usage() $$, $$ values (2048::bigint) $$, 'storage usage adds up file sizes');
select results_eq($$ delete from public.attachments where file_name = 'Shed GA.pdf' returning file_name $$,
  $$ values ('Shed GA.pdf'::text) $$, 'an active user can remove a wrong attachment');

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select is_empty($$ select name from storage.objects where bucket_id = 'files' $$, 'switched-off users cannot see files');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('files', 'project/x/b.jpg') $$,
  '42501', null, 'switched-off users cannot upload');
select tests.clear_authentication();

select results_eq($$ select action from public.audit_log where table_name = 'attachments' order by id $$,
  $$ values ('INSERT'::text), ('DELETE'::text) $$, 'adding and removing attachments is audited');

select * from finish();
rollback;
```

If this CLI's Storage version blocks direct SQL inserts into `storage.objects`, replace the two `storage.objects` insert assertions with `policies_are('storage', 'objects', …)`, listing the four policy names. Upload behaviour is then covered by Task 8's e2e test.

- [ ] **Step 2: Run `npx supabase test db`.** Expected: `03` FAILS. `01` and `02` pass.
- [ ] **Step 3: Write the migration `20261024000003_attachments_storage.sql`.**
  - **`attachments`:**
    - Columns as in spec 6.2, plus the common columns.
    - An index on `(entity_type, entity_id)`.
    - Triggers `set_row_meta` and `audit_row`.
    - Policies for select, insert, delete and update, each `public.is_active_user()`.
    - Grant update only on `caption`.
  - **Bucket:** `insert into storage.buckets (id, name, public, file_size_limit) values ('files', 'files', false, 10485760) on conflict (id) do nothing`.
  - **Storage policies:** four policies on `storage.objects`, for select, insert, update and delete, each `bucket_id = 'files' and public.is_active_user()`.
  - **`storage_usage()`:** `security definer`. Raises the `42501` message unless `is_active_user()`. Returns the sum of `(metadata->>'size')::bigint` for bucket `files` (0 when empty) and `pg_database_size(current_database())`.
- [ ] **Step 4: Run `npx supabase db reset && npx supabase test db`.** Expected: `01`, `02` and `03` pass.
- [ ] **Step 5: Run `npm run db:types && npm run typecheck`.** Expected: pass.
- [ ] **Step 6: Commit.**

```bash
git add -A && git commit -m "feat: add attachments table and private file storage"
```

---

### Task 5: Login, session proxy and app shell

**Files:**
- Create:
  - Supabase and auth helpers: `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/proxy.ts`, `src/proxy.ts`, `src/lib/action-result.ts`, `src/lib/messages.ts`, `src/lib/auth.ts`
  - Login: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/login/login-form.tsx`, `src/app/(auth)/login/actions.ts`, `src/app/auth/signout/route.ts`
  - App pages: `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`, `src/app/(app)/projects/page.tsx`, `src/app/(app)/quotes/page.tsx`, `src/app/(app)/money/page.tsx`, `src/app/(app)/more/page.tsx`
  - Components: `src/components/app-nav.tsx`, `src/components/placeholder.tsx`, `src/components/sign-out-button.tsx`
  - Install and icons: `src/app/manifest.ts`, `src/app/icons/[size]/route.tsx`, `src/app/apple-icon.tsx`
  - Playwright: `playwright.config.ts`, `tests/e2e/global-setup.ts`, `tests/e2e/fixtures.ts`
- Modify: `src/app/layout.tsx` (metadata: title `SteelFlow`, `themeColor` `#1B232A`), `src/app/globals.css` (Tailwind `@theme` tokens)
- Delete: `src/app/page.tsx` (replaced by `src/app/(app)/page.tsx`)
- Test: `tests/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `Database` types (Tasks 2–4) and `profiles.is_active`.
- Produces:
  - `createClient(): Promise<SupabaseClient<Database>>` in `server.ts`, using `cookies()` with `getAll`/`setAll`. `setAll` is wrapped in try/catch for Server Components.
  - `createBrowserSupabase(): SupabaseClient<Database>` in `browser.ts`.
  - `updateSession(request: NextRequest): Promise<NextResponse>` in `lib/supabase/proxy.ts`. It refreshes the session with `getClaims()`, redirects requests without a session to `/login` (except `/login` and `/auth/signout`), and redirects `/login` to `/` when a session exists.
  - `GET /auth/signout?reason=switched-off` (`src/app/auth/signout/route.ts`) signs out with `signOut({ scope: 'local' })`, which clears the cookies, then redirects to `/login`, keeping the `reason`. It is a route handler because Server Components cannot clear cookies; signing out from the layout would loop between `/` and `/login`.
  - The `src/proxy.ts` matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `manifest.webmanifest`, `icons/`, `apple-icon` and image files.
  - `type ActionResult<T = null> = { ok: true; data: T } | { ok: false; message: string; fieldErrors?: Record<string, string> }`, with helpers `ok<T>(data: T)`, `fail(message: string, fieldErrors?: Record<string, string>)` and `zodFieldErrors(error: ZodError): Record<string, string>`, which returns the first message per top-level key.
  - `MESSAGES` in `src/lib/messages.ts`:

    | Key | Text |
    |---|---|
    | `unexpected` | `Something went wrong. Nothing was saved. Try again.` |
    | `expired` | `Your login has expired. Log in again.` |
    | `switchedOff` | `This login has been switched off. Ask another user to switch it back on.` |
    | `wrongLogin` | `Wrong email or password.` |

  - `type ActiveUser = { id: string; fullName: string; email: string }`.
  - `requireActiveUser(): Promise<ActiveUser>`, for pages and layouts. With no session it redirects to `/login`. For an inactive user it redirects to `/auth/signout?reason=switched-off`.
  - `activeUserForAction(): Promise<ActionResult<{ user: ActiveUser; supabase: SupabaseClient<Database> }>>`, for server actions. It returns `fail(MESSAGES.expired)` or `fail(MESSAGES.switchedOff)`.
  - `signIn(prev: ActionResult | null, formData: FormData): Promise<ActionResult>`, which redirects to `/` on success, and `signOut(): Promise<void>`.
  - `tests/e2e/fixtures.ts` exports:
    - `OWNER = { email: 'owner@steelflow.test', password: 'steelflow-dev-1', fullName: 'Test Owner' }`
    - `login(page: Page, user: { email: string; password: string }): Promise<void>`
    - `createTestUser(user: { email: string; password: string; fullName: string }): Promise<string>`, which uses the admin API with `SUPABASE_SECRET_KEY` from `.env.local` and returns the id. If the email is already registered, it returns the existing user's id instead of failing.

- [ ] **Step 1: Install dependencies.**

```bash
npm install @supabase/supabase-js@^2.118.0 @supabase/ssr@^0.12.7 server-only zod@^4.6.7
npm install -D @playwright/test@^1.64.1 && npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`.**
  - Settings: `testDir: 'tests/e2e'`, `workers: 1`, `fullyParallel: false`, `globalSetup: './tests/e2e/global-setup.ts'`.
  - `use`: `baseURL: 'http://127.0.0.1:3000'`, `browserName: 'chromium'`, `viewport: { width: 390, height: 844 }`, `isMobile: true`, `hasTouch: true`.
  - `webServer`: `{ command: 'npm run dev', url: 'http://127.0.0.1:3000/login', reuseExistingServer: true, timeout: 120_000 }`.
  - Load `.env.local` with `process.loadEnvFile('.env.local')`.
  - `global-setup.ts` calls `createTestUser(OWNER)`.
- [ ] **Step 3: Write the failing tests.**

```ts
// tests/e2e/auth.spec.ts
import { expect, test } from '@playwright/test'
import { OWNER, login } from './fixtures'

test('a visitor who is not logged in is sent to the login screen', async ({ page }) => {
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Log in to SteelFlow' })).toBeVisible()
})

test('a wrong password gets a plain message', async ({ page }) => {
  await login(page, { email: OWNER.email, password: 'not-the-password' })
  await expect(page.getByText('Wrong email or password.')).toBeVisible()
})

test('the owner logs in, uses the phone menu and logs out', async ({ page }) => {
  await login(page, OWNER)
  await expect(page).toHaveURL('/')
  const nav = page.getByRole('navigation', { name: 'Main' })
  for (const label of ['Home', 'Projects', 'Quotes', 'Money', 'More']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible()
  }
  expect((await nav.getByRole('link', { name: 'Home' }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await nav.getByRole('link', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test.describe('on a wide screen', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })
  test('the menu sits down the side', async ({ page }) => {
    await login(page, OWNER)
    const box = (await page.getByRole('navigation', { name: 'Main' }).boundingBox())!
    expect(box.x).toBeLessThan(10)
    expect(box.height).toBeGreaterThan(400)
  })
})

test('the app can be added to the home screen', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'SteelFlow', short_name: 'SteelFlow', display: 'standalone', start_url: '/' })
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512'])
  expect((await request.get('/icons/512')).headers()['content-type']).toBe('image/png')
})
```

- [ ] **Step 4: Run `npm run test:e2e`.** Expected: FAIL (no login page, no manifest).
- [ ] **Step 5: Implement the Supabase clients, `updateSession`, `src/proxy.ts`, `action-result.ts`, `messages.ts` and `auth.ts`** with the signatures above.
- [ ] **Step 6: Implement the login screen.**
  - Heading `Log in to SteelFlow`.
  - Fields labelled `Email` and `Password`, and a button `Log in`.
  - `signIn` maps Supabase's errors to messages:
    - `invalid_credentials` → `MESSAGES.wrongLogin`
    - `user_banned` → `MESSAGES.switchedOff`
    - anything else → `MESSAGES.unexpected`
  - `/login?reason=switched-off` shows `MESSAGES.switchedOff`.
  - The form uses `useActionState` and keeps the typed email when there's an error.
- [ ] **Step 7: Implement the app shell.**
  - `(app)/layout.tsx` calls `requireActiveUser()` and renders `<AppNav>` (`<nav aria-label="Main">`), using one element styled as a fixed bottom bar below `md` and a left column at `md` and wider.
  - The Projects, Quotes and Money pages render `<Placeholder title="…" />`, showing the title and `Not built yet.`
  - The Home page shows `Welcome, {fullName}`.
  - The More page has the `Log out` button. Task 6 adds a `Users` link and Task 8 a `Settings` link.
  - `globals.css` defines the tokens `--color-ink #1B232A`, `--color-surface #FFFFFF`, `--color-ground #EDF0F2`, `--color-line #D2D8DD`, `--color-muted #56616B`, `--color-oxide #A2412A` and `--color-ok #2E7A4E`.
- [ ] **Step 8: Implement the install files.**
  - `manifest.ts`: name, short name, `display: 'standalone'`, `start_url: '/'`, `theme_color` and `background_color`, and icons `/icons/192` and `/icons/512` as `image/png`.
  - `icons/[size]/route.tsx`: an `ImageResponse` square with the letters `SF` in white on `#1B232A`. `generateStaticParams` returns 192 and 512, and any other size returns 404.
  - `apple-icon.tsx`: the same design at 180 px.
- [ ] **Step 9: Run `npm run test:e2e`.** Expected: 5 passed. Then run `npm run lint && npm run typecheck && npm test`. Expected: pass.
- [ ] **Step 10: Commit.**

```bash
git add -A && git commit -m "feat: add login, session proxy and phone-first app shell"
```

---

### Task 6: Users — add, switch off or on, reset password

**Files:**
- Create:
  - Database: `supabase/migrations/20261024000004_user_admin.sql`
  - Server: `src/lib/supabase/admin.ts`, `src/lib/phone.ts`
  - Users module: `src/modules/users/schema.ts`, `src/modules/users/queries.ts`, `src/modules/users/actions.ts`, `src/modules/users/components/user-list.tsx`, `src/modules/users/components/add-user-form.tsx`, `src/modules/users/components/user-row-actions.tsx`
  - Screen: `src/app/(app)/settings/users/page.tsx`
  - Setup script: `scripts/create-first-user.mjs`
- Test: `supabase/tests/database/04_user_admin.test.sql`, `tests/unit/phone.test.ts`, `tests/unit/users-schema.test.ts`, `tests/e2e/users.spec.ts`

**Interfaces:**
- Consumes: `activeUserForAction`, `requireActiveUser`, `ActionResult`, `MESSAGES` and `zodFieldErrors` (Task 5); `OWNER`, `login` and `createTestUser` (Task 5 fixtures).
- Produces:
  - `public.set_profile_active(p_user uuid, p_active boolean) returns void`. It is `security definer` and refuses inactive callers with errcode `42501`. When `p_user = auth.uid()` and `p_active` is false, it refuses with `You can't switch off your own login.` (`P0001`).
  - `createAdminClient(): SupabaseClient<Database>`, `server-only`, using the secret key with `persistSession: false`.
  - `normalizeIndianMobile(input: string): string | null`.
  - `newUserSchema` (`{ fullName, phone, email, password }`), `resetPasswordSchema` (`{ userId, password }`) and `setActiveSchema` (`{ userId, active }`).
  - `type UserRow = { id: string; fullName: string; phone: string | null; loginEmail: string; isActive: boolean; isYou: boolean }` and `listUsers(): Promise<UserRow[]>`, which lists active users first, then by name.
  - `createUser(input: unknown): Promise<ActionResult<{ id: string }>>`
  - `setUserActive(input: unknown): Promise<ActionResult>`
  - `resetUserPassword(input: unknown): Promise<ActionResult>`

- [ ] **Step 1: Write the failing tests.**

```sql
-- supabase/tests/database/04_user_admin.test.sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);
select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ select public.set_profile_active('22222222-2222-2222-2222-222222222222', false) $$, 'an active user can switch another login off');
select results_eq($$ select is_active from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$, $$ values (false) $$, 'the login is now off');
select throws_ok($$ select public.set_profile_active('11111111-1111-1111-1111-111111111111', false) $$, 'P0001', 'You can''t switch off your own login.', 'cannot switch off yourself');
select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.set_profile_active('11111111-1111-1111-1111-111111111111', false) $$, '42501', 'You need an active login to do this.', 'a switched-off user cannot switch others off');
select tests.clear_authentication();
select results_eq($$ select changed_by from public.audit_log where table_name = 'profiles' and action = 'UPDATE' and record_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$, 'the audit log shows who switched the login off');

select * from finish();
rollback;
```

```ts
// tests/unit/phone.test.ts
import { expect, it } from 'vitest'
import { normalizeIndianMobile } from '@/lib/phone'

it('keeps 10 digits from common ways of typing a mobile number', () => {
  expect(normalizeIndianMobile('98765 43210')).toBe('9876543210')
  expect(normalizeIndianMobile('+91 98765-43210')).toBe('9876543210')
  expect(normalizeIndianMobile('098765 43210')).toBe('9876543210')
})
it('rejects numbers that are not Indian mobiles', () => {
  expect(normalizeIndianMobile('12345')).toBeNull()
  expect(normalizeIndianMobile('5876543210')).toBeNull()
})
```

```ts
// tests/unit/users-schema.test.ts
import { describe, expect, it } from 'vitest'
import { newUserSchema } from '@/modules/users/schema'

const good = { fullName: '  Ravi Kumar ', phone: '98765 43210', email: ' Ravi@Example.com ', password: 'workshop-26' }

describe('newUserSchema', () => {
  it('tidies a complete user', () => {
    expect(newUserSchema.parse(good)).toEqual({ fullName: 'Ravi Kumar', phone: '9876543210', email: 'ravi@example.com', password: 'workshop-26' })
  })
  it('allows a blank phone', () => {
    expect(newUserSchema.parse({ ...good, phone: '' }).phone).toBeNull()
  })
  it.each([
    ['fullName', 'R', 'Enter the full name.'],
    ['phone', '12345', 'Enter a 10-digit mobile number.'],
    ['email', 'not-an-email', 'Enter a valid email address.'],
    ['password', 'short', 'Use at least 8 characters.'],
  ])('explains a bad %s', (field, value, message) => {
    const result = newUserSchema.safeParse({ ...good, [field]: value })
    expect(result.success).toBe(false)
    expect(result.error!.issues.find((i) => i.path[0] === field)!.message).toBe(message)
  })
})
```

```ts
// tests/e2e/users.spec.ts
import { expect, test } from '@playwright/test'
import { OWNER, createTestUser, login } from './fixtures'

test('add a second user who can then log in', async ({ page }) => {
  await login(page, OWNER)
  await page.goto('/settings/users')
  await page.getByRole('button', { name: 'Add user' }).click()
  await page.getByLabel('Full name').fill('Ravi Kumar')
  await page.getByLabel('Mobile').fill('9876543210')
  await page.getByLabel('Login email').fill('ravi@steelflow.test')
  await page.getByLabel('Password').fill('ravi-pass-26')
  await page.getByRole('button', { name: 'Save user' }).click()
  await expect(page.getByRole('row', { name: /Ravi Kumar/ })).toContainText('Active')
  await page.goto('/more')
  await page.getByRole('button', { name: 'Log out' }).click()
  await login(page, { email: 'ravi@steelflow.test', password: 'ravi-pass-26' })
  await expect(page).toHaveURL('/')
})

test('a login email can only be used once', async ({ page }) => {
  await createTestUser({ email: 'meena@steelflow.test', password: 'meena-pass-26', fullName: 'Meena' })
  await login(page, OWNER)
  await page.goto('/settings/users')
  await page.getByRole('button', { name: 'Add user' }).click()
  await page.getByLabel('Full name').fill('Meena Again')
  await page.getByLabel('Login email').fill('meena@steelflow.test')
  await page.getByLabel('Password').fill('meena-pass-27')
  await page.getByRole('button', { name: 'Save user' }).click()
  await expect(page.getByText('A user with this login email already exists.')).toBeVisible()
})

test('switching a user off ends their access, even mid-session', async ({ browser }) => {
  await createTestUser({ email: 'arjun@steelflow.test', password: 'arjun-pass-26', fullName: 'Arjun Das' })
  const arjun = await (await browser.newContext()).newPage()
  await login(arjun, { email: 'arjun@steelflow.test', password: 'arjun-pass-26' })
  await expect(arjun).toHaveURL('/')

  const owner = await (await browser.newContext()).newPage()
  await login(owner, OWNER)
  await owner.goto('/settings/users')
  const row = owner.getByRole('row', { name: /Arjun Das/ })
  await row.getByRole('button', { name: 'Switch off' }).click()
  await row.getByRole('button', { name: 'Yes, switch off' }).click()
  await expect(row).toContainText('Switched off')

  await arjun.reload()
  await expect(arjun).toHaveURL(/\/login/)
  await expect(arjun.getByText('This login has been switched off. Ask another user to switch it back on.')).toBeVisible()
  await login(arjun, { email: 'arjun@steelflow.test', password: 'arjun-pass-26' })
  await expect(arjun.getByText('This login has been switched off. Ask another user to switch it back on.')).toBeVisible()

  await row.getByRole('button', { name: 'Switch on' }).click()
  await expect(row).toContainText('Active')
  await login(arjun, { email: 'arjun@steelflow.test', password: 'arjun-pass-26' })
  await expect(arjun).toHaveURL('/')
})

test('your own row cannot be switched off', async ({ page }) => {
  await login(page, OWNER)
  await page.goto('/settings/users')
  const own = page.getByRole('row', { name: /Test Owner/ })
  await expect(own).toContainText('You')
  await expect(own.getByRole('button', { name: 'Switch off' })).toHaveCount(0)
})

test('reset someone’s password', async ({ page }) => {
  await createTestUser({ email: 'kiran@steelflow.test', password: 'kiran-pass-26', fullName: 'Kiran' })
  await login(page, OWNER)
  await page.goto('/settings/users')
  const row = page.getByRole('row', { name: /Kiran/ })
  await row.getByRole('button', { name: 'Reset password' }).click()
  await row.getByLabel('New password').fill('kiran-new-27')
  await row.getByRole('button', { name: 'Save password' }).click()
  await expect(row.getByText('Password changed. Tell Kiran the new one in person.')).toBeVisible()
  await page.goto('/more')
  await page.getByRole('button', { name: 'Log out' }).click()
  await login(page, { email: 'kiran@steelflow.test', password: 'kiran-new-27' })
  await expect(page).toHaveURL('/')
})
```

- [ ] **Step 2: Run `npx supabase test db` and `npm test`.** Expected: `04` FAILS, and the phone and users-schema tests FAIL.
- [ ] **Step 3: Write the migration `20261024000004_user_admin.sql`** with `set_profile_active` as described in Interfaces, granted to `authenticated`.
- [ ] **Step 4: Implement `phone.ts` and `users/schema.ts`.**
  - `normalizeIndianMobile` strips everything except digits, then removes a leading `91` from 12 digits or a leading `0` from 11 digits. It accepts the result only if it matches `/^[6-9]\d{9}$/`.
  - `newUserSchema` rules:
    - `fullName`: trimmed, 2–80 characters.
    - `phone`: blank → `null`; otherwise `normalizeIndianMobile`, or the error `Enter a 10-digit mobile number.`
    - `email`: trimmed, lower-cased, valid.
    - `password`: 8–72 characters.
- [ ] **Step 5: Run `npx supabase db reset && npx supabase test db && npm test`.** Expected: all pass.
- [ ] **Step 6: Implement `admin.ts`, `queries.ts`, `actions.ts`, the components and the Users page.**
  - **`createUser`:** calls `admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, phone, created_by: <caller id> } })`. The error `email_exists` becomes `A user with this login email already exists.`
  - **`setUserActive`:**
    - Switching **off**: call `rpc('set_profile_active', …)` as the caller first, then ban with `ban_duration: '876000h'`.
    - Switching **on**: unban with `ban_duration: 'none'` first, then call the RPC.
    - Pass database messages through unchanged.
  - **`resetUserPassword`:** calls `admin.auth.admin.updateUserById(userId, { password })`.
  - **Users page:**
    - A table with one row per user (`role="row"`): name, email, mobile, and a status pill (`Active` / `Switched off`). The caller's own row shows `You` and has no switch-off button.
    - Switching off needs a confirmation button in the row (`Yes, switch off`). Don't use `window.confirm`.
    - The add form has fields `Full name`, `Mobile`, `Login email` and `Password`, with the hint `Share the password with them in person.`
  - Add a `Users` link to the More page.
- [ ] **Step 7: Write `scripts/create-first-user.mjs`.**
  - It reads `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `FIRST_USER_EMAIL`, `FIRST_USER_NAME` and `FIRST_USER_PASSWORD` from the environment.
  - It exits with a message if any are missing or the password is shorter than 8 characters.
  - It creates the user already confirmed and prints `Created a login for {name} ({email}).`
  - Check it against local:

```bash
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SECRET_KEY=<local secret> FIRST_USER_EMAIL=first@steelflow.test FIRST_USER_NAME="First User" FIRST_USER_PASSWORD=first-pass-26 node scripts/create-first-user.mjs
```

  Expected: the success line, and that login works at `/login`.
- [ ] **Step 8: Run `npm run test:e2e`.** Expected: all auth and users tests pass. Then run `npm run lint && npm run typecheck && npm test`. Expected: pass.
- [ ] **Step 9: Commit.**

```bash
git add -A && git commit -m "feat: add user management and first-user setup script"
```

---

### Task 7: File upload pipeline

**Files:**
- Create: `src/lib/upload/rules.ts`, `src/lib/upload/shrink-image.ts`, `src/lib/upload/upload-file.ts`, `src/modules/files/paths.ts`, `src/modules/files/actions.ts`
- Test: `tests/unit/upload-rules.test.ts`, `tests/unit/file-paths.test.ts`

**Interfaces:**
- Consumes: `activeUserForAction`, `ok` and `fail` (Task 5); `createBrowserSupabase` (Task 5).
- Produces:
  - Constants: `MAX_FILE_BYTES = 10 * 1024 * 1024` and `MAX_RAW_IMAGE_BYTES = 40 * 1024 * 1024`.
  - `validateFile(meta: { name: string; type: string; size: number }): { ok: true; kind: 'image' | 'document' } | { ok: false; message: string }`
  - `fitWithin(width: number, height: number, maxSide: number): { width: number; height: number }`. It never enlarges, keeps the aspect ratio, rounds, and has a minimum of 1.
  - `shrinkImage(file: File, opts?: { maxSide?: number; quality?: number }): Promise<File>`. Defaults are 1600 and 0.75. It decodes with `createImageBitmap(file, { imageOrientation: 'from-image' })` so phone photos come out upright, paints on a white background, and outputs `image/jpeg` named `<base>.jpg`. If decoding fails, it throws `This image couldn't be read. Choose a JPEG or PNG instead.`
  - `type AttachmentEntityType = 'customer' | 'supplier' | 'worker' | 'project' | 'quotation' | 'activity_update' | 'purchase_bill' | 'dispatch' | 'expense'`
  - `type UploadTarget = { kind: 'attachment'; entityType: AttachmentEntityType; entityId: string } | { kind: 'logo' }`
  - `safeFileName(name: string): string` and `buildObjectPath(target: UploadTarget, fileName: string, id: string): string`
  - Server actions: `createSignedUpload(target: UploadTarget, fileName: string): Promise<ActionResult<{ path: string; token: string }>>` (generates the id with `crypto.randomUUID()`) and `getFileUrl(path: string): Promise<ActionResult<{ url: string }>>` (600 seconds).
  - Client: `uploadFile(file: File, target: UploadTarget, opts?: { maxSide?: number }): Promise<{ ok: true; path: string; name: string; type: string; size: number } | { ok: false; message: string }>`. It validates, shrinks images, gets a signed upload, then calls `storage.from('files').uploadToSignedUrl`. Any thrown error becomes a message.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/upload-rules.test.ts
import { describe, expect, it } from 'vitest'
import { fitWithin, validateFile } from '@/lib/upload/rules'

describe('validateFile', () => {
  it('accepts photos, PDFs and drawings', () => {
    expect(validateFile({ name: 'site.jpg', type: 'image/jpeg', size: 6_000_000 })).toEqual({ ok: true, kind: 'image' })
    expect(validateFile({ name: 'truss.pdf', type: 'application/pdf', size: 2_000_000 })).toEqual({ ok: true, kind: 'document' })
    expect(validateFile({ name: 'Shed GA.DWG', type: '', size: 3_000_000 })).toEqual({ ok: true, kind: 'document' })
  })
  it('lets big photos through because they are shrunk first', () => {
    expect(validateFile({ name: 'p.jpg', type: 'image/jpeg', size: 15_000_000 }).ok).toBe(true)
  })
  it('refuses documents over 10 MB', () => {
    expect(validateFile({ name: 'big.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 + 1 }))
      .toEqual({ ok: false, message: 'This file is larger than 10 MB.' })
  })
  it('refuses photos over 40 MB', () => {
    expect(validateFile({ name: 'huge.png', type: 'image/png', size: 41 * 1024 * 1024 }))
      .toEqual({ ok: false, message: 'This photo is too large to upload.' })
  })
  it('explains HEIC photos', () => {
    expect(validateFile({ name: 'IMG_0001.HEIC', type: 'image/heic', size: 2_000_000 }))
      .toEqual({ ok: false, message: "HEIC photos can't be uploaded. Choose a JPEG or PNG instead." })
  })
  it('refuses other file types', () => {
    expect(validateFile({ name: 'notes.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1000 }))
      .toEqual({ ok: false, message: "This file type isn't supported. Use a photo (JPEG, PNG or WebP), a PDF, or a DWG or DXF drawing." })
  })
})

describe('fitWithin', () => {
  it('shrinks the long side and keeps the shape', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
    expect(fitWithin(1601, 1, 1600)).toEqual({ width: 1600, height: 1 })
  })
  it('never enlarges', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})
```

```ts
// tests/unit/file-paths.test.ts
import { expect, it } from 'vitest'
import { buildObjectPath, safeFileName } from '@/modules/files/paths'

it('builds storage paths per owner', () => {
  expect(buildObjectPath({ kind: 'attachment', entityType: 'project', entityId: 'abc' }, 'Shed GA (rev 2).PDF', 'id1'))
    .toBe('project/abc/id1-shed-ga-rev-2.pdf')
  expect(buildObjectPath({ kind: 'logo' }, 'Logo.png', 'id2')).toBe('settings/logo/id2-logo.png')
})
it('makes file names safe and short', () => {
  expect(safeFileName('   ')).toBe('file')
  const long = safeFileName('x'.repeat(200) + '.jpg')
  expect(long.length).toBeLessThanOrEqual(80)
  expect(long.endsWith('.jpg')).toBe(true)
})
```

- [ ] **Step 2: Run `npm test`.** Expected: FAIL (modules not found).
- [ ] **Step 3: Implement `rules.ts` and `paths.ts`.**
  - `validateFile`:
    - Images: `image/jpeg`, `image/png` and `image/webp`.
    - Documents: `application/pdf`, or a name ending `.pdf`, `.dwg` or `.dxf` (case-insensitive).
    - HEIC: `image/heic`, `image/heif`, or a `.heic`/`.heif` name.
  - `safeFileName`: split at the last `.`; lower-case both parts; replace each run of characters other than `[a-z0-9]` with `-`; trim dashes; trim the base so the whole name is at most 80 characters; an empty base becomes `file`.
- [ ] **Step 4: Run `npm test`.** Expected: pass.
- [ ] **Step 5: Implement `shrink-image.ts`, `upload-file.ts` and `files/actions.ts`** with the signatures above. They are exercised end to end by the logo upload in Task 8.
- [ ] **Step 6: Run `npm run lint && npm run typecheck`.** Expected: pass.
- [ ] **Step 7: Commit.**

```bash
git add -A && git commit -m "feat: add file upload pipeline with photo shrinking"
```

---

### Task 8: Settings screen with logo and storage use

**Files:**
- Create: `src/lib/india-states.ts`, `src/lib/doc-number.ts`, `src/modules/settings/schema.ts`, `src/modules/settings/queries.ts`, `src/modules/settings/actions.ts`, `src/modules/settings/components/settings-form.tsx`, `src/modules/settings/components/doc-number-formats.tsx`, `src/modules/settings/components/logo-field.tsx`, `src/modules/settings/components/storage-usage.tsx`, `src/app/(app)/settings/page.tsx`
- Modify: `src/app/(app)/more/page.tsx` (the Settings link)
- Test: `tests/unit/settings-schema.test.ts`, `tests/unit/doc-number.test.ts`, `tests/e2e/settings.spec.ts`

**Interfaces:**
- Consumes:
  - `uploadFile` and `getFileUrl` (Task 7).
  - `activeUserForAction`, `ok`, `fail` and `zodFieldErrors` (Task 5).
  - `formatBytes` (Task 1).
  - The `settings` table (Task 3) and `storage_usage()` (Task 4).
- Produces:
  - `INDIA_STATES: ReadonlyArray<{ name: string; code: string }>`, using the GST state codes. For example: Telangana `36`, Andhra Pradesh `37`, Karnataka `29`, Maharashtra `27`, Tamil Nadu `33`.
  - `settingsSchema` (camelCase form fields → typed values, including the derived `stateCode`) and `type SettingsInput = z.output<typeof settingsSchema>`.
  - `toSettingsRow(input: SettingsInput): Database['public']['Tables']['settings']['Update']`.
  - `getSettings()`, and `getStorageUsage(): Promise<{ filesBytes: number; databaseBytes: number }>`.
  - Server actions: `updateSettings(input: unknown): Promise<ActionResult>`, `setLogo(path: string): Promise<ActionResult>` (saves the path and deletes the previous logo object) and `removeLogo(): Promise<ActionResult>`.
  - In `src/lib/doc-number.ts`:
    - `type DocType = 'project' | 'quotation' | 'invoice' | 'dispatch' | 'po'`, and `DOC_TYPE_LABELS: Record<DocType, string>` (`Project`, `Quotation`, `Invoice`, `Delivery note`, `Purchase order`).
    - `type DocNumberFormat = { prefix: string; separator: '/' | '-' | ''; yearStyle: 'full' | 'short' | 'none'; digits: number }`.
    - `formatDocNumber(format: DocNumberFormat, isoDate: string, n: number): string`, which gives exactly what `next_doc_number` gives.
    - `gstInvoiceLengthMessage(format: DocNumberFormat, isoDate: string, nextNumber: number): string | null`.
    - `makeDocNumberFormatsSchema(ctx: { gstEnabled: boolean; today: string })`, a schema for an object with one `{ prefix, separator, yearStyle, digits, nextNumber }` entry per `DocType`.
  - `getDocNumberFormats(today: string): Promise<Record<DocType, DocNumberFormat & { nextNumber: number }>>`. The next number is `last_number + 1` for the current series, or 1.
  - `saveDocNumberFormats(input: unknown): Promise<ActionResult>`. It parses with `makeDocNumberFormatsSchema({ gstEnabled: <from settings>, today: todayIST() })`, then calls `rpc('save_doc_number_formats', { p_formats, p_as_of: todayIST() })`. It sends `next_number` only for types whose next number the user changed, and passes database messages through unchanged.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/settings-schema.test.ts
import { describe, expect, it } from 'vitest'
import { settingsSchema } from '@/modules/settings/schema'

const valid = {
  workshopName: 'Sri Balaji Fabricators', address: '', city: 'Hyderabad', state: 'Telangana', pincode: '500018',
  phone: '040 2345 6789', email: '', bankName: 'State Bank of India', bankAccountName: 'Sri Balaji Fabricators',
  bankAccountNo: '30123456789', bankIfsc: 'sbin0001234', upiId: 'balajifab@okhdfcbank', gstEnabled: false, gstin: '',
  defaultGstRate: '18', defaultMarginPercent: '15', quotationValidityDays: '15', invoiceDueDays: '15',
  quotationTerms: '', invoiceTerms: '',
}
const errorFor = (input: object, field: string) =>
  settingsSchema.safeParse(input).error?.issues.find((i) => i.path[0] === field)?.message

describe('settingsSchema', () => {
  it('tidies input: blanks become null, codes become upper case, numbers are parsed', () => {
    expect(settingsSchema.parse(valid)).toMatchObject({
      address: null, email: null, gstin: null, bankIfsc: 'SBIN0001234',
      stateCode: '36', defaultGstRate: 18, quotationValidityDays: 15,
    })
  })
  it('needs a GSTIN before GST can be switched on', () => {
    expect(errorFor({ ...valid, gstEnabled: true }, 'gstin')).toBe('Enter your GSTIN to switch GST on.')
  })
  it('accepts a lower-case GSTIN for the same state', () => {
    expect(settingsSchema.parse({ ...valid, gstEnabled: true, gstin: '36abcde1234f1z5' }).gstin).toBe('36ABCDE1234F1Z5')
  })
  it('catches a GSTIN from another state', () => {
    expect(errorFor({ ...valid, gstin: '27ABCDE1234F1Z5' }, 'gstin'))
      .toBe('This GSTIN is for a different state (code 27). Check the state or the GSTIN.')
  })
  it.each([
    ['workshopName', ' ', 'Enter the workshop name.'],
    ['pincode', '50001', 'Enter a 6-digit PIN code.'],
    ['bankIfsc', 'SBIN001234', 'Enter an 11-character IFSC code, like SBIN0001234.'],
    ['bankAccountNo', '12ab', 'Enter the account number (9 to 18 digits).'],
    ['upiId', 'balajifab', 'Enter a UPI ID, like workshop@okhdfcbank.'],
    ['gstin', '36ABCDE1234F1Y5', 'Enter a 15-character GSTIN, like 36ABCDE1234F1Z5.'],
    ['defaultMarginPercent', '150', 'Enter a number from 0 to 100.'],
    ['invoiceDueDays', '400', 'Enter a whole number of days from 0 to 365.'],
  ])('explains a bad %s', (field, value, message) => {
    expect(errorFor({ ...valid, [field]: value }, field)).toBe(message)
  })
})
```

```ts
// tests/unit/doc-number.test.ts
import { describe, expect, it } from 'vitest'
import { formatDocNumber, makeDocNumberFormatsSchema } from '@/lib/doc-number'

describe('formatDocNumber gives the same numbers as the database', () => {
  it.each([
    [{ prefix: 'INV', separator: '/', yearStyle: 'full', digits: 4 }, '2027-03-31', 1, 'INV/2026-27/0001'],
    [{ prefix: 'SBF', separator: '/', yearStyle: 'full', digits: 3 }, '2026-10-24', 246, 'SBF/2026-27/246'],
    [{ prefix: 'SBF-Q', separator: '-', yearStyle: 'short', digits: 4 }, '2026-10-24', 1, 'SBF-Q-26-27-0001'],
    [{ prefix: 'PO', separator: '/', yearStyle: 'none', digits: 4 }, '2027-04-01', 2, 'PO/0002'],
    [{ prefix: 'SBF', separator: '/', yearStyle: 'full', digits: 3 }, '2026-10-24', 1000, 'SBF/2026-27/1000'],
    [{ prefix: 'SF', separator: '', yearStyle: 'none', digits: 5 }, '2026-10-24', 42, 'SF00042'],
  ] as const)('%o on %s, number %i, is %s', (format, date, n, expected) => {
    expect(formatDocNumber(format, date, n)).toBe(expected)
  })
})

const row = (prefix: string) => ({ prefix, separator: '/', yearStyle: 'full', digits: '4', nextNumber: '1' })
const formats = { project: row('PRJ'), quotation: row('QT'), invoice: row('INV'), dispatch: row('DN'), po: row('PO') }
const gstOff = makeDocNumberFormatsSchema({ gstEnabled: false, today: '2026-10-24' })
const gstOn = makeDocNumberFormatsSchema({ gstEnabled: true, today: '2026-10-24' })
const errorAt = (schema: typeof gstOff, input: object, type: string, field: string) =>
  schema.safeParse(input).error?.issues.find((i) => i.path[0] === type && i.path[1] === field)?.message

describe('document number formats', () => {
  it('tidies prefixes into capitals and parses numbers', () => {
    expect(gstOff.parse({ ...formats, invoice: { ...row('sbf'), digits: '3', nextNumber: '246' } }).invoice)
      .toEqual({ prefix: 'SBF', separator: '/', yearStyle: 'full', digits: 3, nextNumber: 246 })
  })
  it.each([
    ['prefix', 'INV#', 'Use 1 to 10 letters, digits, - or /, starting with a letter or digit.'],
    ['digits', '9', 'Choose from 1 to 8 digits.'],
    ['nextNumber', '0', 'Enter a whole number, 1 or more.'],
  ])('explains a bad %s', (field, value, message) => {
    expect(errorAt(gstOff, { ...formats, invoice: { ...row('INV'), [field]: value } }, 'invoice', field)).toBe(message)
  })
  it('needs a different prefix for each document type', () => {
    expect(errorAt(gstOff, { ...formats, dispatch: row('inv') }, 'dispatch', 'prefix')).toBe('Each document type needs its own prefix.')
  })
  it('keeps GST invoice numbers to 16 characters once GST is on', () => {
    const long = { ...formats, invoice: row('SBFAB-INV') }
    expect(gstOff.safeParse(long).success).toBe(true)
    expect(errorAt(gstOn, long, 'invoice', 'prefix')).toBe('GST invoice numbers can have at most 16 characters. This format makes 22.')
    expect(gstOn.safeParse(formats).success).toBe(true)
  })
})
```

```ts
// tests/e2e/settings.spec.ts
import { expect, test } from '@playwright/test'
import { OWNER, login } from './fixtures'

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
  await page.goto('/settings')
})

test('workshop details are kept after saving', async ({ page }) => {
  await page.getByLabel('Workshop name').fill('Sri Balaji Fabricators')
  await page.getByLabel('State').selectOption('Telangana')
  await page.getByLabel('PIN code').fill('500018')
  await page.getByLabel('UPI ID').fill('balajifab@okhdfcbank')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(page.getByText('Saved')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Workshop name')).toHaveValue('Sri Balaji Fabricators')
  await expect(page.getByLabel('State')).toHaveValue('Telangana')
  await expect(page.getByLabel('UPI ID')).toHaveValue('balajifab@okhdfcbank')
})

test('GST cannot be switched on without a GSTIN', async ({ page }) => {
  await page.getByLabel('Workshop name').fill('Sri Balaji Fabricators')
  await page.getByLabel('Charge GST on invoices').check()
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(page.getByText('Enter your GSTIN to switch GST on.')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Charge GST on invoices')).not.toBeChecked()
})

test('a large logo is shrunk before upload', async ({ page }) => {
  const png = await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 3000
    c.height = 2000
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#A2412A'
    ctx.fillRect(0, 0, 3000, 2000)
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  await page.getByLabel('Logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png) })
  const img = page.getByRole('img', { name: 'Workshop logo' })
  await expect(img).toBeVisible()
  expect(await img.evaluate((el: HTMLImageElement) => Math.max(el.naturalWidth, el.naturalHeight))).toBeLessThanOrEqual(600)
})

test('invoice numbers can carry on from the bill book', async ({ page }) => {
  const invoice = page.getByRole('group', { name: 'Invoice numbers' })
  await invoice.getByLabel('Prefix').fill('sbf')
  await invoice.getByLabel('Digits').fill('3')
  await invoice.getByLabel('Next number').fill('246')
  await expect(invoice.getByText(/^Next: SBF\/\d{4}-\d{2}\/246$/)).toBeVisible()
  await page.getByRole('button', { name: 'Save numbering' }).click()
  await expect(page.getByText('Numbering saved')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('group', { name: 'Invoice numbers' }).getByText(/^Next: SBF\/\d{4}-\d{2}\/246$/)).toBeVisible()
})

test('a long invoice format gets a GST warning', async ({ page }) => {
  const invoice = page.getByRole('group', { name: 'Invoice numbers' })
  await invoice.getByLabel('Prefix').fill('SBFAB-INV')
  await invoice.getByLabel('Digits').fill('4')
  await expect(invoice.getByText('GST invoice numbers can have at most 16 characters. This format makes 22.')).toBeVisible()
})

test('storage use is shown against the free limits', async ({ page }) => {
  await expect(page.getByText(/^Files: .+ of 1 GB$/)).toBeVisible()
  await expect(page.getByText(/^Database: .+ of 500 MB$/)).toBeVisible()
})
```

- [ ] **Step 2: Run `npm test`.** Expected: the `settings-schema` and `doc-number` tests FAIL.
- [ ] **Step 3: Implement `india-states.ts`, `doc-number.ts` and `settings/schema.ts`.**
  - **`doc-number.ts` rules** (spec 7.11):
    - Prefixes are trimmed, upper-cased and checked against `/^[A-Z0-9][A-Z0-9/-]{0,9}$/`.
    - `digits` is a whole number from 1 to 8, and `nextNumber` a whole number of 1 or more.
    - Duplicate prefixes are flagged on the later type, in the order project, quotation, invoice, dispatch, po.
    - With `gstEnabled`, the invoice entry is refused when `gstInvoiceLengthMessage(...)` returns a message. The message goes on `invoice.prefix`.
  - **Settings schema** rules:
  - **Tidying:** strings are trimmed, and blank optional strings become `null`.
  - **Formats:**

    | Field | Rule |
    |---|---|
    | GSTIN | `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/`, after upper-casing |
    | IFSC | `/^[A-Z]{4}0[A-Z0-9]{6}$/`, after upper-casing |
    | UPI ID | `/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/` |
    | Account number | 9–18 digits |
    | PIN code | `/^[1-9]\d{5}$/` |
    | Percentages | 0–100 |
    | Days | whole numbers, `quotationValidityDays` 1–365 and `invoiceDueDays` 0–365 |
    | Terms | up to 2000 characters |

  - **Cross-field rules** (refinements):
    - GST switched on needs a GSTIN.
    - A GSTIN's first two digits must match the chosen state's code.
- [ ] **Step 4: Run `npm test`.** Expected: pass.
- [ ] **Step 5: Implement the queries, actions, components and the Settings page.**
  - **Sections:** Workshop, Bank and UPI, GST, Defaults, Document numbers, Logo, Storage.
  - **Labels:** exactly as used in the e2e tests. The GST checkbox is labelled `Charge GST on invoices`.
  - **Saving:** on success, show the message `Saved`. Field errors show under their fields.
  - **Logo:** uses `uploadFile(file, { kind: 'logo' }, { maxSide: 600 })`, then `setLogo(path)`. The preview is a plain `<img alt="Workshop logo">` using `getFileUrl`, not `next/image`, which would need remote-host configuration. Disable `@next/next/no-img-element` on that line.
  - **Storage:** shows `Files: {formatBytes(filesBytes)} of 1 GB` and `Database: {formatBytes(databaseBytes)} of 500 MB`.
  - **Document numbers:** a separate form with its own `Save numbering` button, which shows `Numbering saved` on success.
    - One `<fieldset>` per type, with the legend `{label} numbers` (e.g. `Invoice numbers`).
    - Fields: `Prefix`, `Separator` (`/`, `-`, `None`), `Year` (options showing the current year, e.g. `2026-27`, `26-27`, `No year`), `Digits` and `Next number`.
    - Under the fields, a live line `Next: {formatDocNumber(...)}` for today.
    - In the Invoice fieldset, `gstInvoiceLengthMessage` shows as a warning while GST is off. The schema refuses it when GST is on.
- [ ] **Step 6: Run `npm run test:e2e`.** Expected: all auth, users and settings tests pass. Then run `npm run lint && npm run typecheck && npm test`. Expected: pass.
- [ ] **Step 7: Commit.**

```bash
git add -A && git commit -m "feat: add settings screen with logo upload and storage use"
```

---

### Task 9: GitHub workflows, backup and restore rehearsal

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/backup.yml`, `docs/operations/backup-restore.md`

**Interfaces:**
- Consumes: the npm scripts (Task 1) and the migrations and tests (Tasks 2–8).
- Produces:
  - A CI check that runs on every push to `dev` and `main`, and on pull requests.
  - A nightly encrypted backup artifact, `steelflow-backup-<date>`, kept for 14 days.
  - The repository secrets it expects: `SUPABASE_DB_URL` (the Live **Session pooler** URI, port 5432, because GitHub runners have no IPv6) and `BACKUP_PASSPHRASE`.

- [ ] **Step 1: Write `ci.yml`.**
  - Runs on `ubuntu-latest`, on push to `dev` and `main`, and on pull requests.
  - Steps:
    1. `actions/checkout@v4`
    2. `actions/setup-node@v4` with `node-version: 24` and `cache: npm`
    3. `npm ci`
    4. `npm run lint`
    5. `npm run typecheck`
    6. `npm test`
    7. `npx supabase start`
    8. `npx supabase test db`
  - Phone-screen tests stay local (spec 10).
- [ ] **Step 2: Write `backup.yml`.**
  - Triggers: `schedule: - cron: '30 20 * * *'` (02:00 IST) and `workflow_dispatch`.
  - Steps:
    1. `supabase/setup-cli@v1` with `version: 2.122.0`.
    2. Three dumps from `${{ secrets.SUPABASE_DB_URL }}`: `supabase db dump --db-url "$SUPABASE_DB_URL" --role-only -f roles.sql`, then the same with no extra flag to `-f schema.sql`, then `--data-only --use-copy -f data.sql`.
    3. `tar czf backup.tar.gz roles.sql schema.sql data.sql`.
    4. `gpg --batch --yes --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" --symmetric --cipher-algo AES256 -o "steelflow-backup-$(date -u +%F).tar.gz.gpg" backup.tar.gz`.
    5. `actions/upload-artifact@v4` with `retention-days: 14` and `if-no-files-found: error`.
  - Add a header comment: scheduled runs only start once this file is on the default branch (`main`).
- [ ] **Step 3: Lint both workflows.**

```bash
docker run --rm -v "$(pwd -W 2>/dev/null || pwd):/repo" -w /repo rhysd/actionlint:1.7.7 -color
```

Expected: no output and exit code 0.
- [ ] **Step 4: Rehearse backup and restore locally.** With the local stack running and the e2e data present (run `npm run test:e2e` first):

```bash
DB=postgresql://postgres:postgres@127.0.0.1:54322/postgres
npx supabase db dump --db-url "$DB" --data-only --use-copy -f "$TEMP/data.sql"
grep -c 'COPY "auth"."users"' "$TEMP/data.sql"
gpg --batch --yes --pinentry-mode loopback --passphrase rehearsal --symmetric -o "$TEMP/data.sql.gpg" "$TEMP/data.sql"
gpg --batch --yes --pinentry-mode loopback --passphrase rehearsal -d -o "$TEMP/data.restored.sql" "$TEMP/data.sql.gpg"
npx supabase db reset
docker exec -i supabase_db_steelflow psql -U postgres -d postgres -v ON_ERROR_STOP=1 --single-transaction \
  -c "SET session_replication_role = replica" \
  -c "delete from storage.buckets; delete from public.settings; delete from public.doc_number_formats; delete from public.doc_counters;" \
  -f - < "$TEMP/data.restored.sql"
docker exec supabase_db_steelflow psql -U postgres -d postgres -tAc "select count(*) from public.profiles"
```

Expected: the `grep` count is at least 1, the restore finishes without errors, and the profile count is 5 (the users the e2e tests create).
- The `delete` line clears the rows the migrations insert (the settings row, the number formats and the `files` bucket), so the backup's copies don't clash with them.
- If the restore stops on a duplicate key in one of Supabase's internal bookkeeping tables, add that table to the data dump with `-x schema.table`, both here and in `backup.yml`.
- If `COPY` lines are written without quotes in this CLI version, grep for `COPY auth.users` instead.

Then run `npm run test:e2e` again to make sure it still passes after a reset.
- [ ] **Step 5: Write `docs/operations/backup-restore.md`.** It covers:
  - Where backups are, and how long they're kept.
  - The two secrets, and that losing `BACKUP_PASSPHRASE` makes every backup unreadable.
  - How to run a backup by hand: `gh workflow run backup.yml --ref main`.
  - How to download, decrypt and restore into local, copying the commands rehearsed in Step 4 but using `tar xzf` on the full archive.
  - How to restore into a brand-new Supabase project after a disaster:
    1. `supabase db push` the migrations.
    2. Run the same clearing `delete` line and `data.sql` restore against the new project's Session pooler URI, using `psql` from the `supabase_db_steelflow` container.
    3. Upload any re-collected files.
  - The Milestone A check: restore last night's Live backup locally, and compare the row counts of `profiles` and `settings` with Live.
- [ ] **Step 6: Commit.**

```bash
git add -A && git commit -m "ci: add test workflow, nightly encrypted backup and restore guide"
```

---

### Task 10: Test and Live environments, first deploy

The owner does the steps marked **(Owner)**. They create accounts, handle real passwords and keys, or publish code. The implementer prepares the commands and checks the results.

**Files:**
- Modify: `supabase/config.toml` (`[db] major_version` only, if it differs from the hosted projects), `README.md` (a "Deploying" section listing the steps below)

- [ ] **Step 1 (Owner): Make the GitHub repository private.** Settings → General → Change visibility. Backups are encrypted either way, but a private repo keeps them out of view.
- [ ] **Step 2 (Owner): Create two Supabase projects on the Free plan in region Mumbai (`ap-south-1`):** `steelflow-test` and `steelflow-live`. Keep each database password in a password manager.
  - Check the Postgres version under Settings → Infrastructure. If it differs from `[db] major_version` in `supabase/config.toml`, change the config, then run `npx supabase stop && npx supabase start && npx supabase test db`. Expected: all pass. Commit with `chore: match local Postgres version to Supabase`.
- [ ] **Step 3 (Owner): Configure Auth in both projects.**
  - Authentication → Sign In / Providers: turn **Allow new users to sign up** off, and turn Email **Confirm email** off.
  - Authentication → URL Configuration: the Site URL is set in Step 6, once the Vercel URLs exist.
- [ ] **Step 4: Push the migrations to Test.** The owner types the database password when asked.

```bash
npx supabase link --project-ref <test-project-ref>
npx supabase db push
npx supabase migration list
```

Expected: 4 migrations listed, both locally and remotely.
- [ ] **Step 5 (Owner): Create the first login on Test** with `scripts/create-first-user.mjs` (Task 6, Step 7), using Test's URL and secret key.
- [ ] **Step 6 (Owner): Set up Vercel.**
  1. New Project → import the GitHub repository → framework Next.js → Production Branch `main`.
  2. Environment variables: **Production** gets Live's URL, publishable key and secret key; **Preview** gets Test's.
  3. Push `dev` (`git push origin dev`) to get the preview URL for the `dev` branch.
  4. Set that preview URL as Test's Site URL (Step 3).
- [ ] **Step 7: Check that CI passes.**

```bash
gh run list --branch dev --limit 1
```

Expected: the `CI` run shows `completed  success`.
- [ ] **Step 8 (Owner): Stage 0 check on Test.** On a phone, open the `dev` preview URL. Log in, add a second user, fill in Settings with a logo, and use Add to Home Screen.
- [ ] **Step 9 (Owner approves): Release to Live.**

```bash
git checkout main && git merge --ff-only dev && git push origin main && git checkout dev
npx supabase link --project-ref <live-project-ref> && npx supabase db push
```

  Then the owner:
  - Creates the first Live login with the script, using Live's values.
  - Sets Live's Site URL to the production Vercel URL.
- [ ] **Step 10 (Owner): Switch on nightly backups.**
  1. GitHub → Settings → Secrets and variables → Actions. Add `SUPABASE_DB_URL` (from Live → Connect → **Session pooler** URI, with the password filled in) and `BACKUP_PASSPHRASE` (a long random phrase, also kept in the password manager).
  2. Run the backup once by hand:

```bash
gh workflow run backup.yml --ref main && gh run list --workflow backup.yml --limit 1
```

  Expected: `completed  success`, with an artifact named `steelflow-backup-<date>`.
- [ ] **Step 11 (Owner): Stage 0 is done.** On a phone, open the production Vercel URL. Log in, add a second user and fill in Settings. All automated tests passing, including E12, completes stage 0.
