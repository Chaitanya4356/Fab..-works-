# Stage 3 — Quotations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the workshop price jobs in SteelFlow:
- build a cost sheet and add a margin;
- generate customer items, as one lump sum or line by line;
- number, send, follow up, revise, accept or reject a quotation;
- print it as a PDF with the amount in words, and share it on WhatsApp;
- turn an accepted quotation into a project carrying its price and cost estimates.

**Architecture:**
- **Tables:** three new tables, `quotations`, `quotation_cost_lines` and `quotation_items`. They are written only through four `security definer` functions:
  - `save_quotation_draft`;
  - `set_quotation_status`;
  - `create_quotation_revision`;
  - `convert_quotation`.

  The functions compute every stored amount in SQL (spec 4.9). The screen shows the same sums live, using integer-paise maths in TypeScript.
- **PDFs:** `@react-pdf/renderer` builds them in a route handler, with Noto Sans embedded for the ₹ sign.
- **WhatsApp sharing:** it uses the phone's share sheet. Where that cannot send files, it uses a `wa.me` link to a stored copy of the PDF that works for 7 days.

**Tech Stack:** As stage 2, plus `@react-pdf/renderer` 4.9.0. Next.js 16.4 already lists it in `serverExternalPackages`, so no config is needed for bundling.

**Spec:** `docs/superpowers/specs/2026-10-24-steelflow-design.md`. Read:
- 4.3, 4.4, 4.6, 4.9 and 4.10;
- 5 (the Customer → Quotation and Accepted quotation → Project hand-offs);
- 6.2 (Quotations: `quotations`, `quotation_cost_lines`, `quotation_items`; Projects: `projects.quotation_id`), 6.3, 6.4 and 6.5;
- 7.1 and 7.11;
- 8 (E10, E11);
- 9 (stage 3).

The Stage 2 plan (`docs/superpowers/plans/2026-10-26-stage-2-workers.md`) and its code are the pattern to follow.

## Global Constraints

- Everything in the Stage 0, 1 and 2 Global Constraints still applies. That includes:
  - `requireActiveUser()` at the start of every page and query, and `activeUserForAction()` at the start of every action;
  - `runAction` around every client call to a server action;
  - RLS through `public.is_active_user()`;
  - `set_row_meta` and `audit_row`;
  - `security definer` functions with `set search_path = ''` that first check `public.is_active_user()` and raise `You need an active login to do this.` with errcode `42501`;
  - `DD-MM-YYYY` dates and `₹` with en-IN grouping;
  - 44 px touch targets, 50 rows a page, and no deletes.
- **Money:**
  - Amounts are `numeric(14,2)`, quantities `numeric(14,3)` and the margin `numeric(5,2)`.
  - Every stored amount is computed in SQL, rounded half up to the paisa on each line (`round(qty * rate, 2)`).
  - `grand_total = round(subtotal + gst_amount, 0)`, and `round_off = grand_total − (subtotal + gst_amount)`, which may be negative.
  - The screen's live preview uses `src/lib/money.ts` (integer paise as `bigint`, half up) and must show the same figures SQL stores.
- **Margin is added on top of cost** (spec 7.1):
  - The price is `cost × (1 + margin%)`.
  - Profit is `subtotal − cost_total`, and is shown as `Profit ₹15,000.00 (13.04% of price)`.
  - The profit % is `profit ÷ subtotal × 100`, to 2 decimals.
- **Cost categories:** `material` Material, `labour` Labour, `painting` Painting, `transport` Transport, `other` Other. Their sums become the project's `est_material` … `est_other` on conversion.
- **Statuses**, shown as words: `draft` Draft, `sent` Sent, `accepted` Accepted, `rejected` Rejected, `superseded` Replaced.
- **Revision labels:**
  - Revision 0 shows the plain number, `QT/2026-27/0001`.
  - Revision n shows `QT/2026-27/0001-R1`.
  - The PDF file name is the label with `/` turned into `-`, plus `.pdf`.
- **The lump-sum item** is exactly `Supply, fabrication and erection as per scope of work`, qty `1`, unit `job` (spec 7.1).
- **The PDF never shows the cost sheet, the margin or the profit** (spec 7.1).
- **Amount in words** follows E11 exactly: `Rupees One Lakh Twenty Thousand Only`.
- After every migration, run `npm run db:types`. Run screen tests with `npm run test:e2e`, which resets the local database. Single-spec runs are preceded by `npx supabase db reset`.

**Spec clarifications made in this plan:**
- **Saving a draft is a fourth quotation function, `save_quotation_draft`.** Saving writes the header and every line, which makes it a multi-row write, and spec 6.4 sends those through a function. Users may update one column directly: `follow_up_date`, which spec 6.5 allows on any quotation.
- **A Draft can be marked Rejected.** This closes an enquiry that went nowhere, since quotations are never deleted (spec 6.5). Draft → Accepted is refused: the quotation is sent first.
- **The follow-up reminder appears in two places:**
  - in Stage 3, as a "Follow-ups due" view on the Quotes list and a "Follow up" tag;
  - on the Home screen, which arrives in stage 4.
- **Quotation files are not part of stage 3** (spec 9 lists none). Drawings are attached to the project after conversion. The "its files show on the project" hand-off applies if quotations get files later.
- **GST.** While GST is off, `gst_rate` is null and `gst_amount` is 0. When it is on, `gst_rate` is a snapshot of `settings.default_gst_rate` taken at each save, and the quotation shows one "GST @ 18%" line. The CGST/SGST split belongs to invoices (stage 4).
- **The shared PDF is stored at `share/quotation/{id}/{file}`.**
  - Sharing again replaces it, so there is one stored copy per revision.
  - The link works for 7 days (spec 4.6).
  - Sharing does not change the status; "Mark as sent" is its own button.
- **`project_list_v` is dropped and recreated,** because `projects.quotation_id` changes the `p.*` column list. While recreating it, `is_overdue` becomes `coalesce(…, false)`, fixing the stage 1 deferred minor: a project with no due date was `null`.
- **Conversion creates no activities;** stage 6 adds those (spec 9). `quotation_cost_lines.material_id` arrives in stage 5.
- **Owner decision, 26-10-2026:** the phone check and the Live release come after stage 8. Stage 3 is checked on `localhost`.

## Review Focus

1. **Paise and rounding.**
   - The live totals in the editor must equal what SQL stores: 12.5 m × ₹219.65 is ₹2,745.63 (half up), the grand total is ₹2,746 and the round off is ₹0.37.
   - A mismatch would show the customer one figure and save another.
   - Tests: Task 1 unit `prices line by line with the margin on each cost rate`, and Task 2 pgTAP `line amounts round half up to the paisa and the total to the rupee`.
2. **Editing a quotation that was sent meanwhile,** for example from an old tab or by a second user. The save is refused with `This quotation has been sent, so it can no longer be edited. Revise it to make changes.` and the form keeps what was typed. Tests:
   - Task 2 pgTAP `a sent quotation is locked`;
   - Task 4 e2e `a sent quotation cannot be edited from a tab left open`.
3. **Converting twice,** by a double tap or from two screens. One project is made, and the second try says which project it already is. Tests:
   - Task 2 pgTAP `a quotation becomes a project only once`;
   - Task 5 e2e `making a project from two screens makes one project`.
4. **Revising twice:** an old revision revised again from a second screen. It is refused, so there is never a second live revision. Tests: Task 2 pgTAP `a replaced revision cannot be revised again`.
5. **Sharing for a customer with no mobile number.** WhatsApp opens to let the user pick a contact (`https://wa.me/?text=…`), not a broken link. Tests: Task 7 unit `whatsappUrl`.

---

### Task 1: Money, amount in words and quotation sums

**Files:**
- Create: `src/lib/money.ts`, `src/lib/words.ts`, `src/modules/quotations/labels.ts`, `src/modules/quotations/maths.ts`
- Test: `tests/unit/money.test.ts`, `tests/unit/words.test.ts`, `tests/unit/quotation-maths.test.ts`

**Interfaces:**
- Produces:
  - **In `money.ts`** (all amounts `bigint` paise, all quantities `bigint` thousandths, every rounding half up):
    - `parsePaise(value: string | number): bigint | null`. It strips `₹`, commas and spaces, accepts `/^\d{1,12}(\.\d{1,2})?$/`, and returns null otherwise.
    - `parseMilli(value: string | number): bigint | null`. It strips commas and spaces and accepts `/^\d{1,11}(\.\d{1,3})?$/`.
    - `lineAmount(qtyMilli: bigint, ratePaise: bigint): bigint`.
    - `addMargin(paise: bigint, marginPercent: string | number): bigint`, which works in basis points.
    - `percentOf(part: bigint, whole: bigint): string`, two decimals; `'0.00'` when `whole` is 0.
    - `paiseToRupees(paise: bigint): string`, for example `'2745.63'` or `'-0.37'`.
  - **In `words.ts`:** `amountInWords(amount: number | string): string`, using the Indian system (crore, lakh, thousand, hundred). There is no "and" inside the rupees, and paise follow as `and Fifty Paise`.
  - **In `quotations/labels.ts`:**
    - `COST_CATEGORIES`, `type CostCategory` and `CATEGORY_LABELS`;
    - `QUOTATION_STATUSES`, `type QuotationStatus` and `STATUS_LABELS`;
    - `LUMP_SUM_DESCRIPTION`;
    - `quoteLabel(quoteNo: string, revision: number): string`;
    - `pdfFileName(label: string): string`.
  - **In `quotations/maths.ts`:**
    - `type CostLineDraft = { category: CostCategory; description: string; qty: string; unit: string; costRate: string }`;
    - `type ItemDraft = { description: string; hsnSac: string; qty: string; unit: string; rate: string }`;
    - `type QuotationTotals = { costTotal; subtotal; gstAmount; roundOff; grandTotal; profit: bigint; profitPercent: string }`;
    - `generateItems(lines: CostLineDraft[], marginPercent: string, mode: 'lump_sum' | 'itemised'): ItemDraft[]`. Rates are written with 2 decimals.
    - `quotationTotals(input: { costLines: CostLineDraft[]; items: ItemDraft[]; gstRate: string | null }): QuotationTotals`. Lines whose qty or rate does not parse count as 0.
    - `storedTotals(row: { cost_total: number; subtotal: number; gst_amount: number; round_off: number; grand_total: number }): QuotationTotals`.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/money.test.ts
import { describe, expect, it } from 'vitest'
import { addMargin, lineAmount, paiseToRupees, parseMilli, parsePaise, percentOf } from '@/lib/money'

describe('money in paise', () => {
  it('reads rupees and quantities exactly', () => {
    expect(parsePaise('1,15,000')).toBe(11500000n)
    expect(parsePaise('₹ 219.65')).toBe(21965n)
    expect(parsePaise(650)).toBe(65000n)
    expect(parsePaise('1.234')).toBeNull()
    expect(parsePaise('abc')).toBeNull()
    expect(parseMilli('12.5')).toBe(12500n)
    expect(parseMilli('0.125')).toBe(125n)
    expect(parseMilli('1.2345')).toBeNull()
  })
  it('rounds half up to the paisa', () => {
    expect(lineAmount(12500n, 21965n)).toBe(274563n)
    expect(addMargin(19100n, '15')).toBe(21965n)
    expect(addMargin(10000000n, '15')).toBe(11500000n)
    expect(addMargin(33333n, '12.5')).toBe(37500n)
  })
  it('shows paise as rupees and a share as a percentage', () => {
    expect(paiseToRupees(274563n)).toBe('2745.63')
    expect(paiseToRupees(-37n)).toBe('-0.37')
    expect(percentOf(1500000n, 11500000n)).toBe('13.04')
    expect(percentOf(0n, 0n)).toBe('0.00')
  })
})
```

```ts
// tests/unit/words.test.ts
import { expect, it } from 'vitest'
import { amountInWords } from '@/lib/words'

it('writes amounts the Indian way (E11)', () => {
  expect(amountInWords(120000)).toBe('Rupees One Lakh Twenty Thousand Only')
  expect(amountInWords('23550075.50')).toBe('Rupees Two Crore Thirty Five Lakh Fifty Thousand Seventy Five and Fifty Paise Only')
})
it.each([
  [0, 'Rupees Zero Only'],
  [1, 'Rupees One Only'],
  [101, 'Rupees One Hundred One Only'],
  [115000, 'Rupees One Lakh Fifteen Thousand Only'],
  [999999999, 'Rupees Ninety Nine Crore Ninety Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine Only'],
  [1000000000, 'Rupees One Hundred Crore Only'],
  ['0.05', 'Rupees Zero and Five Paise Only'],
])('writes %s in words', (amount, words) => {
  expect(amountInWords(amount)).toBe(words)
})
```

```ts
// tests/unit/quotation-maths.test.ts
import { expect, it } from 'vitest'
import { LUMP_SUM_DESCRIPTION, pdfFileName, quoteLabel } from '@/modules/quotations/labels'
import { generateItems, quotationTotals, storedTotals, type CostLineDraft } from '@/modules/quotations/maths'

const costSheet: CostLineDraft[] = [
  { category: 'material', description: 'Steel sections', qty: '1', unit: 'lot', costRate: '60000' },
  { category: 'labour', description: 'Fabrication and erection', qty: '1', unit: 'job', costRate: '25000' },
  { category: 'painting', description: 'Primer and enamel', qty: '1', unit: 'job', costRate: '10000' },
  { category: 'transport', description: 'Two trips', qty: '1', unit: 'job', costRate: '5000' },
]

it('prices a ₹1,00,000 cost sheet at 15% as one lump sum (E10)', () => {
  const items = generateItems(costSheet, '15', 'lump_sum')
  expect(items).toEqual([{ description: LUMP_SUM_DESCRIPTION, hsnSac: '', qty: '1', unit: 'job', rate: '115000.00' }])
  expect(quotationTotals({ costLines: costSheet, items, gstRate: null })).toEqual({
    costTotal: 10000000n, subtotal: 11500000n, gstAmount: 0n, roundOff: 0n, grandTotal: 11500000n,
    profit: 1500000n, profitPercent: '13.04',
  })
})

it('prices line by line with the margin on each cost rate', () => {
  const lines: CostLineDraft[] = [{ category: 'material', description: 'ISA 40x40x5', qty: '12.5', unit: 'm', costRate: '191' }]
  const items = generateItems(lines, '15', 'itemised')
  expect(items).toEqual([{ description: 'ISA 40x40x5', hsnSac: '', qty: '12.5', unit: 'm', rate: '219.65' }])
  expect(quotationTotals({ costLines: [], items, gstRate: null })).toMatchObject({
    subtotal: 274563n, roundOff: 37n, grandTotal: 274600n,
  })
})

it('adds GST when it is on and rounds the grand total to the rupee', () => {
  const gate = { description: 'MS gate', hsnSac: '7308', qty: '1', unit: 'nos', rate: '99999.50' }
  expect(quotationTotals({ costLines: [], items: [gate], gstRate: null })).toMatchObject({ grandTotal: 10000000n, roundOff: 50n })
  expect(quotationTotals({ costLines: [], items: [{ ...gate, rate: '100000' }], gstRate: '18' })).toMatchObject({
    subtotal: 10000000n, gstAmount: 1800000n, grandTotal: 11800000n, roundOff: 0n,
  })
})

it('counts lines that are not filled in yet as nothing', () => {
  const totals = quotationTotals({
    costLines: [{ category: 'other', description: 'x', qty: '', unit: '', costRate: 'abc' }], items: [], gstRate: null,
  })
  expect(totals).toMatchObject({ costTotal: 0n, subtotal: 0n, grandTotal: 0n, profitPercent: '0.00' })
})

it('reads stored totals back with the profit', () => {
  expect(storedTotals({ cost_total: 100000, subtotal: 115000, gst_amount: 0, round_off: 0, grand_total: 115000 }))
    .toMatchObject({ profit: 1500000n, profitPercent: '13.04' })
})

it('names revisions and their PDF files', () => {
  expect(quoteLabel('QT/2026-27/0001', 0)).toBe('QT/2026-27/0001')
  expect(quoteLabel('QT/2026-27/0001', 2)).toBe('QT/2026-27/0001-R2')
  expect(pdfFileName('QT/2026-27/0001-R2')).toBe('QT-2026-27-0001-R2.pdf')
})
```

- [ ] **Step 2: Run `npm test`.** Expected: the three new files FAIL, because their modules are not found. The other 105 tests pass.
- [ ] **Step 3: Implement the four modules.**
  - Half up for these non-negative amounts is `(n * m + d / 2n) / d` with `bigint` division.
  - `quotationTotals` is the only place that applies the round off. It must not round the subtotal.
  - `amountInWords` splits the rupees into crore, lakh, thousand, hundred and below, and spells the crore part recursively (100 crore is `One Hundred Crore`).
- [ ] **Step 4: Run `npm test && npm run typecheck`.** Expected: all pass.
- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "feat: add paise maths, amount in words and quotation sums"
```

---

### Task 2: Quotations in the database

**Files:**
- Create: `supabase/migrations/20261026000008_quotations.sql`
- Modify:
  - `src/lib/supabase/database.types.ts` (regenerated);
  - `docs/superpowers/specs/2026-10-24-steelflow-design.md`: add `save_quotation_draft` to the 6.4 Quotations row and `quotation_list_v` to the 6.3 table.
- Test: `supabase/tests/database/08_quotations.test.sql`

**Interfaces:**
- Consumes: `is_active_user()`, `set_row_meta()`, `audit_row()`, `next_doc_number()`, `today_ist()`, `financial_year()`, `settings`, `customers`, `projects` and `project_list_v` (earlier stages).
- Produces:
  - **Table `public.quotations`.** It has the spec 6.2 columns plus the common columns.
    - `quote_no text not null` and `revision int not null default 0`.
    - `status` is checked against the five statuses, default `draft`.
    - `margin_percent numeric(5,2) not null default 0`, checked `>= 0`.
    - `cost_total`, `subtotal`, `gst_amount`, `round_off` and `grand_total` are `numeric(14,2) not null default 0`.
    - `project_id uuid references projects`.
    - Checks: `length(trim(title)) > 0`, and `valid_until >= quote_date` when both are set.
    - `UNIQUE (quote_no, revision)`, plus a unique index on `(quote_no) where status <> 'superseded'`.
    - Indexes on `customer_id` and `(status, follow_up_date)`.
  - **Tables `public.quotation_cost_lines` and `public.quotation_items`.** They have the spec 6.2 columns, without `material_id`, plus the common columns.
    - `quotation_id uuid not null references quotations` and `sort_order int not null`.
    - `qty numeric(14,3) not null check (qty > 0)`.
    - Rates and amounts are `not null`, `>= 0`.
    - `description` is required and not blank.
  - **Triggers.**
    - `set_row_meta` on all three tables, and `audit_row` on `quotations` only (spec 4.7).
    - `quotation_lines_locked()`, `BEFORE INSERT OR UPDATE OR DELETE` on both line tables. When the parent's status is not `draft`, it raises `This quotation has been sent, so its lines can no longer be changed. Revise it to make changes.`
  - **`projects.quotation_id uuid references quotations`,** with a unique index where it is not null. It is not in the projects update grant.
  - **`project_list_v`, dropped and recreated** exactly as in stage 1, except that `is_overdue` is wrapped in `coalesce(…, false)`. Its `select` grant is given again.
  - **View `public.quotation_list_v`,** `security_invoker`.
    - Its columns are `id`, `quote_no`, `revision`, `customer_id`, `customer_name`, `title`, `status`, `quote_date`, `valid_until`, `follow_up_date`, `grand_total`, `project_id` and `is_follow_up_due` (`status = 'sent' and follow_up_date <= today_ist()`, coalesced to false).
    - It leaves out `superseded` rows.
  - **Functions** (all `security definer`, `set search_path = ''`, executable by `authenticated` only). Each locks the quotation row `for update`.
    - **`save_quotation_draft(p_quotation_id uuid, p_header jsonb, p_cost_lines jsonb, p_items jsonb) returns uuid`.**
      - The header keys are `customer_id`, `title`, `site_address`, `scope`, `terms`, `enquiry_date`, `quote_date`, `valid_until`, `follow_up_date` and `margin_percent`.
      - Line keys: `category`, `description`, `qty`, `unit` and `cost_rate`.
      - Item keys: `description`, `hsn_sac`, `qty`, `unit` and `rate`.
      - A null id inserts revision 0, with `quote_no = next_doc_number('quotation', quote_date)`. A new quotation for a switched-off customer raises `This customer is switched off. Switch them on before quoting.`
      - An existing id must be a draft. Otherwise it raises:
        - `A newer revision of this quotation exists. Open it to make changes.` when the quotation is `superseded`;
        - `This quotation has been sent, so it can no longer be edited. Revise it to make changes.` for any other status;
        - `This quotation could not be found.` when the id does not exist.
      - It replaces all lines and computes every amount and total as in Global Constraints. The GST snapshot comes from `settings`.
    - **`set_quotation_status(p_quotation_id uuid, p_status text, p_reason text default null) returns void`.**
      - Allowed changes:
        - draft → sent, which needs at least one item, or it raises `Add at least one item before sending.`;
        - draft → rejected;
        - sent → accepted;
        - sent → rejected.
      - It sets `sent_at` on `sent`, and `decided_at` on `accepted` or `rejected`. `rejection_reason` is `nullif(trim(p_reason), '')`.
      - Anything else raises `format('This quotation is %s, so it cannot be marked %s.', old_status, p_status)`.
    - **`create_quotation_revision(p_quotation_id uuid) returns uuid`.**
      - Only `sent` or `rejected` can be revised; anything else raises `Only a sent or rejected quotation can be revised.`
      - It marks the old row `superseded` first, then inserts revision + 1 as a draft with the same `quote_no` and header.
        - `quote_date` is today and `valid_until` is today + `settings.quotation_validity_days`.
        - `follow_up_date`, `sent_at`, `decided_at`, `rejection_reason` and `project_id` are null.
        - The totals are copied.
      - It copies both line tables.
    - **`convert_quotation(p_quotation_id uuid) returns uuid`.**
      - The quotation must be `accepted`; otherwise it raises `Only an accepted quotation can be made into a project.`
      - It must not be converted already; otherwise it raises `format('This quotation is already project %s.', project_no)`.
      - It inserts a `projects` row with:
        - `customer_id`, `title` and `site_address` from the quotation, and `description = scope`;
        - `contract_value = subtotal`;
        - `est_*` = the sum of the cost lines' amounts per category;
        - `quotation_id`, and status `planned`.
      - It sets `quotations.project_id` and returns the project id.
  - **Grants.**
    - `quotations`: `select` and `update (follow_up_date)` to `authenticated`, with select and update policies on `is_active_user()`.
    - Line tables: `select` only.
    - No insert or delete grants anywhere.
    - `revoke all … from anon` on the tables and both views.

- [ ] **Step 1: Write the failing test.**

```sql
-- supabase/tests/database/08_quotations.test.sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);
select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');
update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
insert into public.customers (id, name) values
  ('a0000000-0000-0000-0000-000000000001', 'Sharma Steel Traders'),
  ('a0000000-0000-0000-0000-000000000002', 'Old Customer');
update public.customers set is_active = false where id = 'a0000000-0000-0000-0000-000000000002';

-- E10: a ₹1,00,000 cost sheet at 15% with one lump-sum item.
select lives_ok($$ select public.save_quotation_draft(null,
  jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000001', 'title', 'Warehouse shed',
    'scope', 'Shed 40x80 with sheeting', 'quote_date', public.today_ist(), 'margin_percent', 15),
  '[{"category":"material","description":"Steel","qty":1,"unit":"lot","cost_rate":60000},
    {"category":"labour","description":"Fabrication","qty":1,"unit":"job","cost_rate":25000},
    {"category":"painting","description":"Paint","qty":1,"unit":"job","cost_rate":10000},
    {"category":"transport","description":"Trips","qty":1,"unit":"job","cost_rate":5000}]'::jsonb,
  '[{"description":"Supply, fabrication and erection as per scope of work","qty":1,"unit":"job","rate":115000}]'::jsonb) $$,
  'an active user saves a draft quotation');
select results_eq($$ select quote_no, revision, status from public.quotations where title = 'Warehouse shed' $$,
  $$ values ('QT/' || public.financial_year(public.today_ist()) || '/0001', 0, 'draft'::text) $$, 'a new quotation gets the next number');
select results_eq($$ select cost_total, subtotal, gst_rate, gst_amount, round_off, grand_total from public.quotations where title = 'Warehouse shed' $$,
  $$ values (100000.00::numeric, 115000.00::numeric, null::numeric, 0.00::numeric, 0.00::numeric, 115000.00::numeric) $$,
  'E10: ₹1,00,000 at 15% is priced at ₹1,15,000');

select lives_ok($$ select public.save_quotation_draft(null,
  jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000001', 'title', 'Angle railing', 'quote_date', public.today_ist(), 'margin_percent', 15),
  '[]'::jsonb, '[{"description":"ISA 40x40x5 railing","qty":12.5,"unit":"m","rate":219.65}]'::jsonb) $$, 'a draft with paise saves');
select results_eq($$ select i.amount, q.subtotal, q.round_off, q.grand_total from public.quotations q
    join public.quotation_items i on i.quotation_id = q.id where q.title = 'Angle railing' $$,
  $$ values (2745.63::numeric, 2745.63::numeric, 0.37::numeric, 2746.00::numeric) $$,
  'line amounts round half up to the paisa and the total to the rupee');
select throws_ok($$ select public.save_quotation_draft(null,
  jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000002', 'title', 'Old', 'quote_date', public.today_ist(), 'margin_percent', 15),
  '[]'::jsonb, '[]'::jsonb) $$, 'P0001', 'This customer is switched off. Switch them on before quoting.', 'a switched-off customer cannot be quoted');

select tests.clear_authentication();
update public.settings set gst_enabled = true, gstin = '36ABCDE1234F1Z5', state = 'Telangana', default_gst_rate = 18 where id = 1;
select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ select public.save_quotation_draft((select id from public.quotations where title = 'Angle railing'),
  jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000001', 'title', 'Angle railing', 'quote_date', public.today_ist(), 'margin_percent', 15),
  '[]'::jsonb, '[{"description":"Railing","qty":1,"unit":"job","rate":100000}]'::jsonb) $$, 'a draft is saved again');
select results_eq($$ select gst_rate, gst_amount, grand_total from public.quotations where title = 'Angle railing' $$,
  $$ values (18.00::numeric, 18000.00::numeric, 118000.00::numeric) $$, 'with GST on, the rate from Settings is added');
select tests.clear_authentication();
update public.settings set gst_enabled = false where id = 1;
select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

select throws_ok($$ insert into public.quotations (quote_no, customer_id, title) values ('X', 'a0000000-0000-0000-0000-000000000001', 'Sneaky') $$,
  '42501', null, 'quotations are only written through SteelFlow''s functions');
select throws_ok($$ update public.quotations set title = 'Changed' $$, '42501', null, 'a quotation''s details cannot be changed directly');
select lives_ok($$ update public.quotations set follow_up_date = public.today_ist() where title = 'Warehouse shed' $$, 'the follow-up date can be set directly');
select throws_ok($$ delete from public.quotations $$, '42501', null, 'quotations are never deleted');

select throws_ok($$ select public.set_quotation_status((select id from public.quotations where title = 'Warehouse shed'), 'accepted') $$,
  'P0001', 'This quotation is draft, so it cannot be marked accepted.', 'a draft cannot be accepted before it is sent');
select lives_ok($$ select public.set_quotation_status((select id from public.quotations where title = 'Warehouse shed'), 'sent') $$, 'a draft is sent');
select isnt((select sent_at from public.quotations where title = 'Warehouse shed'), null, 'sending records when');
select throws_ok($$ select public.save_quotation_draft((select id from public.quotations where title = 'Warehouse shed'),
  jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000001', 'title', 'Warehouse shed', 'quote_date', public.today_ist(), 'margin_percent', 15),
  '[]'::jsonb, '[]'::jsonb) $$, 'P0001', 'This quotation has been sent, so it can no longer be edited. Revise it to make changes.', 'a sent quotation is locked');

select public.save_quotation_draft(null, jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000001',
  'title', 'Empty enquiry', 'quote_date', public.today_ist(), 'margin_percent', 15), '[]'::jsonb, '[]'::jsonb);
select throws_ok($$ select public.set_quotation_status((select id from public.quotations where title = 'Empty enquiry'), 'sent') $$,
  'P0001', 'Add at least one item before sending.', 'an empty quotation cannot be sent');
select lives_ok($$ select public.set_quotation_status((select id from public.quotations where title = 'Empty enquiry'), 'rejected', '  Customer went elsewhere ') $$,
  'an enquiry that went nowhere is closed as rejected');
select is((select rejection_reason from public.quotations where title = 'Empty enquiry'), 'Customer went elsewhere', 'the reason is kept');

select lives_ok($$ select public.create_quotation_revision((select id from public.quotations where title = 'Warehouse shed' and revision = 0)) $$,
  'a sent quotation is revised');
select results_eq($$ select revision, status from public.quotations where title = 'Warehouse shed' order by revision $$,
  $$ values (0, 'superseded'::text), (1, 'draft'::text) $$, 'the old revision is replaced by a new draft');
select results_eq($$ select count(*)::int from public.quotation_cost_lines l join public.quotations q on q.id = l.quotation_id
    where q.title = 'Warehouse shed' and q.revision = 1 $$, $$ values (4) $$, 'the cost sheet is copied to the revision');
select throws_ok($$ select public.create_quotation_revision((select id from public.quotations where title = 'Warehouse shed' and revision = 0)) $$,
  'P0001', 'Only a sent or rejected quotation can be revised.', 'a replaced revision cannot be revised again');

select tests.clear_authentication();
select throws_ok($$ insert into public.quotation_items (quotation_id, sort_order, description, qty, rate, amount)
  values ((select id from public.quotations where title = 'Warehouse shed' and revision = 0), 9, 'Extra', 1, 1, 1) $$,
  'P0001', 'This quotation has been sent, so its lines can no longer be changed. Revise it to make changes.', 'lines of a sent quotation are locked');
select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

select public.set_quotation_status((select id from public.quotations where title = 'Warehouse shed' and revision = 1), 'sent');
select public.set_quotation_status((select id from public.quotations where title = 'Warehouse shed' and revision = 1), 'accepted');
select lives_ok($$ select public.convert_quotation((select id from public.quotations where title = 'Warehouse shed' and revision = 1)) $$,
  'an accepted quotation becomes a project');
select results_eq($$ select p.title, p.description, p.contract_value, p.est_material, p.est_labour, p.est_painting, p.est_transport, p.est_other
    from public.projects p join public.quotations q on q.project_id = p.id and p.quotation_id = q.id
    where q.title = 'Warehouse shed' and q.revision = 1 $$,
  $$ values ('Warehouse shed'::text, 'Shed 40x80 with sheeting'::text, 115000.00::numeric, 60000.00::numeric, 25000.00::numeric,
    10000.00::numeric, 5000.00::numeric, 0.00::numeric) $$, 'the project carries the price and the cost sheet as estimates');
select throws_ok($$ select public.convert_quotation((select id from public.quotations where title = 'Warehouse shed' and revision = 1)) $$,
  'P0001', null, 'a quotation becomes a project only once');
select results_eq($$ select is_overdue from public.project_list_v where title = 'Warehouse shed' $$, $$ values (false) $$,
  'a project with no due date is not overdue');

select public.set_quotation_status((select id from public.quotations where title = 'Angle railing'), 'sent');
update public.quotations set follow_up_date = public.today_ist() where title = 'Angle railing';
select results_eq($$ select is_follow_up_due from public.quotation_list_v where title = 'Angle railing' $$, $$ values (true) $$,
  'a sent quotation due for follow-up is flagged');

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select is_empty($$ select id from public.quotations $$, 'switched-off users see no quotations');
select throws_ok($$ select public.save_quotation_draft(null, jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000001',
  'title', 'Nope', 'quote_date', public.today_ist(), 'margin_percent', 15), '[]'::jsonb, '[]'::jsonb) $$,
  '42501', null, 'switched-off users cannot save quotations');
select tests.clear_authentication();
select ok((select count(*) from public.audit_log where table_name = 'quotations') > 0, 'quotations are audited');

select * from finish();
rollback;
```

- [ ] **Step 2: Run `npm run test:db`.** Expected: `08` FAILS, because function `public.save_quotation_draft` does not exist. `01`–`07` pass.
- [ ] **Step 3: Write the migration** with everything under Interfaces, then add the two spec lines.
  - Order: the tables; `projects.quotation_id`; drop and recreate `project_list_v`; the triggers; the functions; then the grants and policies.
  - Revoke `execute` on the four functions and on `quotation_lines_locked()` from `public` and `anon`, then grant `execute` on the four functions to `authenticated`.
- [ ] **Step 4: Run `npm run test:db`.** Expected: `01`–`08` all pass.
- [ ] **Step 5: Run `npm run db:types && npm run typecheck`.** Expected: pass. `ProjectDetail` now includes `quotation_id`.
- [ ] **Step 6: Commit.**

```bash
git add -A && git commit -m "feat: add quotations with numbering, locking, revisions and conversion in the database"
```

---

### Task 3: Quotation editor and quotation page

**Files:**
- Create:
  - Module: `src/modules/quotations/schema.ts`, `form-values.ts`, `queries.ts`, `actions.ts`, `components/quotation-editor.tsx`, `components/totals-block.tsx`, `components/status-pill.tsx`
  - Screens: `src/app/(app)/quotes/new/page.tsx`, `src/app/(app)/quotes/[id]/page.tsx`, `src/app/(app)/quotes/[id]/edit/page.tsx`
- Modify:
  - `src/lib/form-fields.ts`: `quantity()`, `requiredRupees()` and `percent()`.
  - `src/app/(app)/customers/[id]/page.tsx`: a `New quotation` button and a Quotations section.
  - `tests/e2e/fixtures.ts`: `ownerClient()`, which `createTestProject` reuses, and `createTestQuotation`.
- Test: `tests/unit/quotation-schema.test.ts`, `tests/e2e/quotes.spec.ts`

**Interfaces:**
- Consumes:
  - Task 1 and Task 2;
  - `listActiveCustomerOptions` and `getCustomer` (customers);
  - `getSettings` (settings);
  - `todayIST`, `formatINR`, `formatDate`, `<TextField>`, `<FormMessage>` and `runAction`.
- Produces:
  - **In `form-fields.ts`:**
    - `quantity()`: it strips commas and spaces, accepts `/^\d{1,11}(\.\d{1,3})?$/` above 0, and otherwise says `Enter a quantity, like 12 or 12.5.`
    - `requiredRupees()`: like `optionalRupees()`, but a blank gives the same rupees message.
    - `percent()`: it accepts `/^\d{1,3}(\.\d{1,2})?$/`, and otherwise says `Enter a margin like 15 or 12.5.`
  - **`quotationSchema` and `type QuotationInput`**, plus `toSaveArgs(input): { header; costLines; items }`, which returns snake_case JSON for the RPC.
    - `customerId` is `z.guid('Choose a customer.')`.
    - `title` is 2–200 characters, with the message `Enter what the quotation is for.`
    - `siteAddress` is `optionalText(500)`; `scope` and `terms` are `optionalText(4000)`.
    - `enquiryDate`, `validUntil` and `followUpDate` are `optionalDate()`.
    - `quoteDate` is a required date, with the message `Enter the quotation date.`
    - `marginPercent` is `percent()`.
    - `costLines` holds at most 100 lines of `{ category, description, qty, unit, costRate }`. `description` is required, with the message `Describe this cost.`; `qty` is `quantity()`, `unit` is `optionalText(20)` and `costRate` is `requiredRupees()`.
    - `items` holds at most 100 lines of `{ description, hsnSac, qty, unit, rate }`. `description` is required, with the message `Describe this item.`; `hsnSac` is `optionalCode(/^\d{4,8}$/, 'Enter a 4 to 8 digit HSN or SAC code.')`, and `rate` is `requiredRupees()`.
    - A refinement on `validUntil` gives `Valid until cannot be before the quotation date.`
  - **In `form-values.ts`:**
    - `type QuotationFormValues`, which has the header fields as strings plus `costLines: CostLineDraft[]` and `items: ItemDraft[]`;
    - `newQuotationValues(defaults: { today: string; validityDays: number; margin: number; terms: string | null; customer?: { id: string; address: string | null } }): QuotationFormValues`. Site address starts as the customer's address (the spec 5 hand-off Customer → Quotation).
    - `quotationFormValues(q: QuotationDetail): QuotationFormValues`.
  - **In `queries.ts`:**
    - `type QuotationDetail`: the quotation row plus `customer: { id; name; phone; isActive }`, `costLines` and `items` in `sort_order`, and `label` (`quoteLabel`).
    - `getQuotation(id: string): Promise<QuotationDetail | null>`, wrapped in React `cache`.
    - `listCustomerQuotations(customerId: string): Promise<{ id; label; title; status; grandTotal }[]>`, from `quotation_list_v`, newest first.
  - **Server action `saveQuotation(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>>`.** It calls `save_quotation_draft`, revalidates `/quotes` and `/customers/<id>`, and passes database messages through `dbMessage`.
  - **`<QuotationEditor quotationId?: string initial: QuotationFormValues customers: { id; name }[] gstRate: string | null />`.**
    - Labels:
      - header: Customer, Title, Site address, Scope of work, Enquiry date, Quotation date, Valid until, Follow up on, Margin (%) and Terms;
      - each cost line is a `<fieldset aria-label="Cost line N">` with Category, Description, Qty, Unit, Cost rate (₹) and a `Remove` button;
      - each item is a `<fieldset aria-label="Item N">` with Description, HSN/SAC, Qty, Unit, Rate (₹) and `Remove`.
    - Buttons: `Add cost line`, `Add item`, `Price as one lump sum`, `Price line by line` (these two replace the items) and `Save quotation`.
    - Field errors keyed like `items.0.qty` show inside that line.
  - **`<TotalsBlock totals: QuotationTotals gstRate: string | null showCost: boolean />`.** It is a `<section aria-label="Totals">` with no hooks.
    - Each row is one text line, label then amount.
    - With `showCost`, it reads `Cost ₹1,00,000.00`, then `Price before GST ₹1,15,000.00` and `Profit ₹15,000.00 (13.04% of price)`.
    - Then come `GST @ 18% ₹…` when GST is on, `Round off ₹…` when it is not zero, and `Grand total ₹1,15,000.00`.
  - **`<QuotationStatusPill status />`** and **`<FollowUpPill />`**, with the text `Follow up`.
  - **Quotation page `/quotes/[id]`:**
    - the title as the heading;
    - the label in mono;
    - the status pill;
    - the customer as a link;
    - the details: Quotation date, Valid until, Enquiry date, Follow up on, Site and Scope of work;
    - an items table;
    - `<TotalsBlock showCost={false}>`;
    - Terms;
    - a `<section aria-label="Cost sheet">` with the heading `Cost sheet (not shown to the customer)`, its lines, and `Cost`, `Margin 15%` and `Profit ₹15,000.00 (13.04% of price)`;
    - an `Edit` link when the quotation is a draft.
  - **`/quotes/new?customer=<id>`** pre-selects an active customer and fills Site address from their address. **`/quotes/[id]/edit`** redirects to `/quotes/[id]` when the quotation is not a draft.
  - **Customer page.** A `New quotation` button next to `New project`, for active customers. A `Quotations` section lists the label, title (a link), status pill and grand total, or `No quotations yet.`
  - **Fixtures:**
    - `ownerClient(): Promise<SupabaseClient>`, signed in as `OWNER`;
    - `createTestQuotation(q: { customerId: string; title: string; scope?: string; costLines?: { category: string; description: string; qty: number; costRate: number }[]; items: { description: string; qty: number; rate: number; unit?: string }[]; status?: 'sent' | 'accepted' }): Promise<{ id: string; quoteNo: string }>`. It calls the RPCs; `'accepted'` sends the quotation first.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/quotation-schema.test.ts
import { describe, expect, it } from 'vitest'
import { quotationSchema } from '@/modules/quotations/schema'

const valid = {
  customerId: 'a0000000-0000-0000-0000-000000000001', title: ' Warehouse shed ', siteAddress: '', scope: 'Shed 40x80',
  terms: '', enquiryDate: '', quoteDate: '2026-11-02', validUntil: '2026-11-17', followUpDate: '', marginPercent: '15',
  costLines: [{ category: 'material', description: 'Steel', qty: '1', unit: 'lot', costRate: '60,000' }],
  items: [{ description: 'Shed', hsnSac: '', qty: '1', unit: 'job', rate: '₹ 69,000' }],
}
const errorFor = (input: object, path: string) =>
  quotationSchema.safeParse(input).error?.issues.find((i) => i.path.join('.') === path)?.message

describe('quotationSchema', () => {
  it('tidies a quotation', () => {
    expect(quotationSchema.parse(valid)).toMatchObject({
      title: 'Warehouse shed', siteAddress: null, enquiryDate: null, marginPercent: 15,
      costLines: [{ category: 'material', qty: 1, unit: 'lot', costRate: 60000 }],
      items: [{ description: 'Shed', hsnSac: null, qty: 1, rate: 69000 }],
    })
  })
  it.each([
    ['title', { title: ' ' }, 'Enter what the quotation is for.'],
    ['quoteDate', { quoteDate: '' }, 'Enter the quotation date.'],
    ['marginPercent', { marginPercent: '15.555' }, 'Enter a margin like 15 or 12.5.'],
    ['validUntil', { validUntil: '2026-11-01' }, 'Valid until cannot be before the quotation date.'],
    ['items.0.qty', { items: [{ ...valid.items[0], qty: 'two' }] }, 'Enter a quantity, like 12 or 12.5.'],
    ['items.0.qty', { items: [{ ...valid.items[0], qty: '0' }] }, 'Enter a quantity, like 12 or 12.5.'],
    ['items.0.rate', { items: [{ ...valid.items[0], rate: '' }] }, 'Enter an amount in rupees, like 1,25,000 or 1250.50.'],
    ['items.0.hsnSac', { items: [{ ...valid.items[0], hsnSac: '73' }] }, 'Enter a 4 to 8 digit HSN or SAC code.'],
    ['costLines.0.description', { costLines: [{ ...valid.costLines[0], description: '' }] }, 'Describe this cost.'],
  ])('explains a bad %s', (path, change, message) => {
    expect(errorFor({ ...valid, ...change }, path)).toBe(message)
  })
})
```

```ts
// tests/e2e/quotes.spec.ts
import { expect, test, type Page } from '@playwright/test'
import { OWNER, createTestCustomer, createTestQuotation, login } from './fixtures'

const costLine = (page: Page, n: number) => page.getByRole('group', { name: `Cost line ${n}` })
const item = (page: Page, n: number) => page.getByRole('group', { name: `Item ${n}` })

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('price a ₹1,00,000 cost sheet at 15% as one lump sum (E10)', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Quote Test Traders' })
  await page.goto(`/customers/${customerId}`)
  await page.getByRole('link', { name: 'New quotation' }).click()
  await expect(page.getByLabel('Customer')).toHaveValue(customerId)
  await page.getByLabel('Title').fill('Warehouse shed 40x80')
  await expect(page.getByLabel('Margin (%)')).toHaveValue('15')
  const lines = [['Material', 'Steel sections', '60000'], ['Labour', 'Fabrication and erection', '25000'],
    ['Painting', 'Primer and enamel', '10000'], ['Transport', 'Two trips', '5000']]
  for (const [i, [category, description, rate]] of lines.entries()) {
    await page.getByRole('button', { name: 'Add cost line' }).click()
    await costLine(page, i + 1).getByLabel('Category').selectOption({ label: category })
    await costLine(page, i + 1).getByLabel('Description').fill(description)
    await costLine(page, i + 1).getByLabel('Qty').fill('1')
    await costLine(page, i + 1).getByLabel('Cost rate (₹)').fill(rate)
  }
  await page.getByRole('button', { name: 'Price as one lump sum' }).click()
  await expect(item(page, 1).getByLabel('Description')).toHaveValue('Supply, fabrication and erection as per scope of work')
  await expect(item(page, 1).getByLabel('Rate (₹)')).toHaveValue('115000.00')
  const totals = page.getByRole('region', { name: 'Totals' })
  await expect(totals).toContainText('Cost ₹1,00,000.00')
  await expect(totals).toContainText('Price before GST ₹1,15,000.00')
  await expect(totals).toContainText('Profit ₹15,000.00 (13.04% of price)')
  await expect(totals).toContainText('Grand total ₹1,15,000.00')
  await page.getByRole('button', { name: 'Save quotation' }).click()

  await expect(page.getByRole('heading', { name: 'Warehouse shed 40x80' })).toBeVisible()
  await expect(page.getByText(/^QT\/\d{4}-\d{2}\/\d{4}$/)).toBeVisible()
  await expect(page.getByText('Draft', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Totals' })).toContainText('Grand total ₹1,15,000.00')
  await expect(page.getByRole('region', { name: 'Totals' })).not.toContainText('Profit')
  await expect(page.getByRole('region', { name: 'Cost sheet' })).toContainText('Profit ₹15,000.00 (13.04% of price)')

  await page.goto(`/customers/${customerId}`)
  await expect(page.getByRole('link', { name: 'Warehouse shed 40x80' })).toBeVisible()
})

test('a quantity that is not a number is pointed out and nothing typed is lost', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Quote Typo Traders' })
  await page.goto(`/quotes/new?customer=${customerId}`)
  await page.getByLabel('Title').fill('Main gate')
  await page.getByRole('button', { name: 'Add item' }).click()
  await item(page, 1).getByLabel('Description').fill('MS gate 10x6')
  await item(page, 1).getByLabel('Qty').fill('two')
  await item(page, 1).getByLabel('Rate (₹)').fill('18,500')
  await page.getByRole('button', { name: 'Save quotation' }).click()
  await expect(item(page, 1).getByText('Enter a quantity, like 12 or 12.5.')).toBeVisible()
  await expect(item(page, 1).getByLabel('Rate (₹)')).toHaveValue('18,500')
  await expect(page).toHaveURL(/\/quotes\/new/)
})

test('a draft is changed and saved again under the same number', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Quote Edit Traders' })
  const quote = await createTestQuotation({ customerId, title: 'Staircase', items: [{ description: 'Spiral staircase', qty: 1, rate: 85000 }] })
  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Title').fill('Spiral staircase, 3 m')
  await item(page, 1).getByLabel('Rate (₹)').fill('90000')
  await page.getByRole('button', { name: 'Save quotation' }).click()
  await expect(page.getByRole('heading', { name: 'Spiral staircase, 3 m' })).toBeVisible()
  await expect(page.getByText(quote.quoteNo, { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Totals' })).toContainText('Grand total ₹90,000.00')
})
```

- [ ] **Step 2: Run `npm test`, then `npx supabase db reset && npx playwright test quotes`.** Expected: the schema test and `quotes.spec.ts` FAIL, because the modules, the `New quotation` button and the quotation pages do not exist. Every other test passes.
- [ ] **Step 3: Implement the module, the editor, the pages, the customer page changes and the fixtures** listed under Interfaces.
  - The editor's totals come from `quotationTotals` on every change. The quotation page's totals come from `storedTotals`.
  - The Customer picker lists active customers, plus the draft's own customer if they have been switched off.
- [ ] **Step 4: Run `npm test && npx supabase db reset && npx playwright test quotes customers && npm run typecheck && npm run lint`.** Expected: all pass.
- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "feat: add the quotation editor with cost sheet, margin and live totals"
```

---

### Task 4: Quotation list, statuses, follow-ups and revisions

**Files:**
- Create: `src/modules/quotations/components/quotation-actions.tsx`, `src/modules/quotations/components/follow-up-form.tsx`
- Modify:
  - `src/modules/quotations/queries.ts`: `listQuotations`, `listQuotationRevisions` and `getLatestRevisionId`.
  - `src/modules/quotations/actions.ts`: `setQuotationStatus`, `reviseQuotation` and `setFollowUpDate`.
  - `src/app/(app)/quotes/page.tsx`: replaces the placeholder.
  - `src/app/(app)/quotes/[id]/page.tsx`.
- Test: `tests/e2e/quote-status.spec.ts`

**Interfaces:**
- Consumes: Task 3, `quotation_list_v`, `<SearchBox>`, `<Pager>` and the paging helpers.
- Produces:
  - `type QuoteView = 'open' | 'follow_up' | 'accepted' | 'rejected' | 'all'`.
  - **`listQuotations(opts: { q?: string; page: number; view: QuoteView }): Promise<{ rows: QuoteListRow[]; total: number }>`.**
    - `open` is draft plus sent, and `follow_up` is `is_follow_up_due`.
    - Rows are sorted by `quote_date` descending, then `quote_no`.
    - Search matches `quote_no`, `title` and `customer_name`.
    - `QuoteListRow = { id; label; title; customerName; status; grandTotal; followUpDue }`.
  - **`listQuotationRevisions(quoteNo: string): Promise<{ id; label; status; quoteDate }[]>`**, newest first, and **`getLatestRevisionId(quoteNo: string): Promise<string | null>`**, the non-superseded one.
  - **Server actions:**
    - `setQuotationStatus(id: string, status: 'sent' | 'accepted' | 'rejected', reason?: string): Promise<ActionResult>`;
    - `reviseQuotation(id: string): Promise<ActionResult<{ id: string }>>`;
    - `setFollowUpDate(id: string, date: string): Promise<ActionResult>`, where a blank clears it.
  - **List page `/quotes`:**
    - the heading `Quotations` and a `New quotation` button that goes to `/quotes/new`;
    - search with the placeholder `Number, customer or title`;
    - `<nav aria-label="Quotation views">` with Open, Follow-ups due, Accepted, Rejected and All, at 44 px;
    - a table of Quotation (the label and the title as a link), Customer, Amount and Status (the pill, plus `Follow up` when due).
    - Empty text: `No open quotations.`, `No follow-ups due.`, `No accepted quotations.`, `No rejected quotations.` or `No quotations match “<q>”.`
  - **`<QuotationActions>` on the quotation page:**
    - Draft: `Edit`, `Mark as sent` and `Mark rejected`.
    - Sent: `Mark accepted`, `Mark rejected` and `Revise`.
    - Rejected: `Revise`.
    - Accepted: nothing in this task; Task 5 adds `Make project`.
    - `Mark rejected` reveals `Reason (optional)` with `Confirm` and `Cancel`.
    - `Revise` goes to `/quotes/<new id>/edit`.
  - **`<FollowUpForm>`** for drafts and sent quotations: a `Follow up on` date and the button `Save follow-up date`.
  - **More on the quotation page:**
    - A rejected quotation shows `Rejected: <reason>`.
    - A replaced one shows `Replaced by <label of the latest revision>`, linking to it.
    - When there is more than one revision, `<ul aria-label="Revisions">` shows each label (a link), its status and its date.

- [ ] **Step 1: Write the failing test.**

```ts
// tests/e2e/quote-status.spec.ts
import { expect, test } from '@playwright/test'
import { OWNER, createTestCustomer, createTestQuotation, login } from './fixtures'

const istToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10)

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('send, follow up, revise and accept a quotation', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Status Test Traders' })
  const quote = await createTestQuotation({ customerId, title: 'Status test shed', items: [{ description: 'Shed', qty: 1, rate: 50000 }] })
  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Mark as sent' }).click()
  await expect(page.getByText('Sent', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)

  await page.getByLabel('Follow up on').fill(istToday())
  await page.getByRole('button', { name: 'Save follow-up date' }).click()
  await page.goto('/quotes?view=follow_up')
  const row = page.getByRole('row', { name: /Status test shed/ })
  await expect(row).toContainText('Follow up')

  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Revise' }).click()
  await expect(page).toHaveURL(/\/quotes\/[0-9a-f-]+\/edit$/)
  await page.getByRole('group', { name: 'Item 1' }).getByLabel('Rate (₹)').fill('48000')
  await page.getByRole('button', { name: 'Save quotation' }).click()
  await expect(page.getByText(`${quote.quoteNo}-R1`, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mark as sent' }).click()
  await page.getByRole('button', { name: 'Mark accepted' }).click()
  await expect(page.getByText('Accepted', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Revisions' }).getByRole('listitem')).toHaveCount(2)

  await page.goto(`/quotes/${quote.id}`)
  await expect(page.getByText('Replaced', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: `${quote.quoteNo}-R1` }).first()).toBeVisible()
})

test('a sent quotation cannot be edited from a tab left open', async ({ page, context }) => {
  const customerId = await createTestCustomer({ name: 'Old Tab Traders' })
  const quote = await createTestQuotation({ customerId, title: 'Old tab gate', items: [{ description: 'Gate', qty: 1, rate: 20000 }] })
  await page.goto(`/quotes/${quote.id}/edit`)
  const other = await context.newPage()
  await other.goto(`/quotes/${quote.id}`)
  await other.getByRole('button', { name: 'Mark as sent' }).click()
  await expect(other.getByText('Sent', { exact: true })).toBeVisible()

  await page.getByLabel('Title').fill('Old tab gate, changed')
  await page.getByRole('button', { name: 'Save quotation' }).click()
  await expect(page.getByText('This quotation has been sent, so it can no longer be edited. Revise it to make changes.')).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveValue('Old tab gate, changed')
})

test('reject with a reason, and close an enquiry that went nowhere', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Reject Test Traders' })
  const sent = await createTestQuotation({ customerId, title: 'Rejected shed', items: [{ description: 'Shed', qty: 1, rate: 40000 }], status: 'sent' })
  await page.goto(`/quotes/${sent.id}`)
  await page.getByRole('button', { name: 'Mark rejected' }).click()
  await page.getByLabel('Reason (optional)').fill('Price too high')
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('Rejected: Price too high')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revise' })).toBeVisible()

  const draft = await createTestQuotation({ customerId, title: 'Dead enquiry', items: [] })
  await page.goto(`/quotes/${draft.id}`)
  await page.getByRole('button', { name: 'Mark rejected' }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('Rejected', { exact: true })).toBeVisible()
})

test('the list finds quotations by number, customer or title', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Findable Fabricators' })
  const quote = await createTestQuotation({ customerId, title: 'Mezzanine floor', items: [{ description: 'Floor', qty: 1, rate: 30000 }] })
  for (const q of [quote.quoteNo, 'Findable', 'mezzanine']) {
    await page.goto(`/quotes?view=all&q=${encodeURIComponent(q)}`)
    await expect(page.getByRole('link', { name: 'Mezzanine floor' })).toBeVisible()
  }
  const views = page.getByRole('navigation', { name: 'Quotation views' })
  for (const label of ['Open', 'Follow-ups due', 'Accepted', 'Rejected', 'All']) {
    expect((await views.getByRole('link', { name: label }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
})
```

- [ ] **Step 2: Run `npx supabase db reset && npx playwright test quote-status`.** Expected: FAIL, because there is no `Mark as sent` button and no list.
- [ ] **Step 3: Implement the queries, actions, components and page changes** listed under Interfaces. Each action revalidates `/quotes` and the quotation's page.
- [ ] **Step 4: Run `npx supabase db reset && npx playwright test quote-status quotes && npm run typecheck && npm run lint`.** Expected: all pass.
- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "feat: add the quotation list, statuses, follow-ups and revisions"
```

---

### Task 5: Turning an accepted quotation into a project

**Files:**
- Create: `src/modules/quotations/components/convert-button.tsx`
- Modify:
  - `src/modules/quotations/actions.ts`: `convertQuotation`.
  - `src/modules/quotations/queries.ts`: `getQuotationRef`.
  - `src/app/(app)/quotes/[id]/page.tsx`.
  - `src/app/(app)/projects/[id]/page.tsx`: the "From quotation" detail.
- Test: `tests/e2e/quote-convert.spec.ts`

**Interfaces:**
- Consumes: Task 2's `convert_quotation`, Task 4's page, and `getProject` (projects).
- Produces:
  - **`convertQuotation(id: string): Promise<ActionResult<{ projectId: string }>>`.** It revalidates `/projects` and the quotation's page.
  - **`<ConvertButton quotationId />`.** It is shown on an accepted, unconverted quotation, with the text `Make project`. On success it goes to `/projects/<id>`.
  - **On a converted quotation,** the page shows `Project <project_no>` as a link to the project, read through `getProject`.
  - **`getQuotationRef(id: string | null): Promise<{ id: string; label: string } | null>`.**
  - **Project Overview.** A `From quotation` detail, linking the quotation's label, when `quotation_id` is set.

- [ ] **Step 1: Write the failing test.**

```ts
// tests/e2e/quote-convert.spec.ts
import { expect, test } from '@playwright/test'
import { OWNER, createTestCustomer, createTestQuotation, login } from './fixtures'

const E10_COSTS = [
  { category: 'material', description: 'Steel', qty: 1, costRate: 60000 },
  { category: 'labour', description: 'Fabrication', qty: 1, costRate: 25000 },
  { category: 'painting', description: 'Paint', qty: 1, costRate: 10000 },
  { category: 'transport', description: 'Trips', qty: 1, costRate: 5000 },
]

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('an accepted quotation becomes a project with its price and estimates', async ({ page }) => {
  const customerId = await createTestCustomer({ name: 'Convert Test Traders' })
  const quote = await createTestQuotation({
    customerId, title: 'Convert shed', scope: 'Shed 40x80 with sheeting', costLines: E10_COSTS,
    items: [{ description: 'Supply, fabrication and erection as per scope of work', qty: 1, rate: 115000, unit: 'job' }], status: 'accepted',
  })
  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Make project' }).click()
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/)
  await expect(page.getByRole('heading', { name: 'Convert shed' })).toBeVisible()
  for (const amount of ['₹1,15,000.00', '₹60,000.00', '₹25,000.00', '₹10,000.00', '₹5,000.00']) {
    await expect(page.getByText(amount, { exact: true })).toBeVisible()
  }
  await expect(page.getByText('Shed 40x80 with sheeting')).toBeVisible()

  await page.getByRole('link', { name: quote.quoteNo }).click()
  await expect(page.getByRole('link', { name: /^Project PRJ\// })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Make project' })).toHaveCount(0)
})

test('making a project from two screens makes one project', async ({ page, context }) => {
  const customerId = await createTestCustomer({ name: 'Twice Convert Traders' })
  const quote = await createTestQuotation({ customerId, title: 'Twice shed', items: [{ description: 'Shed', qty: 1, rate: 70000 }], status: 'accepted' })
  const other = await context.newPage()
  await page.goto(`/quotes/${quote.id}`)
  await other.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Make project' }).click()
  await expect(page).toHaveURL(/\/projects\//)
  await other.getByRole('button', { name: 'Make project' }).click()
  await expect(other.getByText(/^This quotation is already project PRJ\/.+\.$/)).toBeVisible()
})
```

- [ ] **Step 2: Run `npx supabase db reset && npx playwright test quote-convert`.** Expected: FAIL, because there is no `Make project` button.
- [ ] **Step 3: Implement** the action, the button, `getQuotationRef` and the two page changes.
- [ ] **Step 4: Run `npx supabase db reset && npx playwright test quote-convert projects && npm run typecheck && npm run lint`.** Expected: all pass.
- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "feat: turn an accepted quotation into a project"
```

---

### Task 6: Quotation PDF

**Files:**
- Create:
  - Fonts: `src/lib/pdf/fonts/NotoSans-Regular.ttf`, `src/lib/pdf/fonts/NotoSans-Bold.ttf` and `src/lib/pdf/fonts/OFL.txt`.
  - Code: `src/lib/pdf/fonts.ts`, `src/modules/quotations/pdf-model.ts`, `src/modules/quotations/pdf-document.tsx`, `src/modules/quotations/pdf.ts` and `src/app/api/pdf/[doc]/[id]/route.ts`.
- Modify: `package.json` (`@react-pdf/renderer@4.9.0`), `next.config.ts` and `src/app/(app)/quotes/[id]/page.tsx` (a `PDF` link).
- Test: `tests/unit/quotation-pdf.test.ts`, `tests/e2e/quote-pdf.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–3, `getSettings`' columns, and `activeUserForAction`.
- Produces:
  - **The fonts** come from npm `@expo-google-fonts/noto-sans@0.4.2`:
    - `400Regular/NotoSans_400Regular.ttf` and `700Bold/NotoSans_700Bold.ttf`;
    - `LICENSE_FONT`, saved as `OFL.txt` (SIL Open Font License 1.1).

    Both fonts contain U+20B9 ₹ (checked on 26-10-2026). The package is fetched with `npm pack` into a temporary folder and is not kept as a dependency.
  - **`registerPdfFonts(): void`.** It is idempotent. It registers family `Noto Sans` with weights 400 and 700 from `path.join(process.cwd(), 'src/lib/pdf/fonts/…')`, and turns off hyphenation.
  - **`next.config.ts`** gets `outputFileTracingIncludes: { '/api/pdf/**': ['src/lib/pdf/fonts/*.ttf'], '/quotes/**': ['src/lib/pdf/fonts/*.ttf'] }`, so Vercel ships the fonts.
  - **`type QuotationPdfSource`.** It holds only customer-facing data:
    - the quotation fields `quoteNo`, `revision`, `quoteDate`, `validUntil`, `title`, `siteAddress`, `scope`, `terms`, `gstRate`, `subtotal`, `gstAmount`, `roundOff` and `grandTotal`;
    - `customer: { name; address; city; state; pincode; phone; gstin }`;
    - `items: { description; hsnSac; qty; unit; rate; amount }[]`;
    - `workshop: { name; address; city; state; pincode; phone; email; gstEnabled; gstin }`.

    It has no cost or margin fields at all.
  - **`quotationPdfModel(src: QuotationPdfSource): QuotationPdfModel`.** The model is:
    - `workshop { name; lines: string[] }`, whose lines include `GSTIN …` only when `gstEnabled`;
    - `number` (the label), `date` and `validUntil` (DD-MM-YYYY);
    - `customer { name; lines }`, `subject`, `site` and `scope`;
    - `items`, each `{ no; description; hsnSac; qty; unit; rate; amount }` with `formatINR` amounts;
    - `totals { label; value }[]`: `Subtotal`, then `GST @ 18%` only when `gstRate`, `Round off` only when it is not zero, then `Grand total`;
    - `amountInWords` (of the grand total), `terms: string[]` (split on new lines) and `signature` (`For <workshop name>`).
  - **`renderQuotationPdf(model: QuotationPdfModel, logo: { data: Buffer; format: 'png' | 'jpg' } | null): Promise<Buffer>`**, in `pdf-document.tsx`. It is pure apart from `registerPdfFonts`. It draws an A4 page in Noto Sans in this order:
    1. the logo and the workshop block;
    2. the title `QUOTATION`;
    3. the number, date and valid-until block;
    4. the customer block;
    5. the subject, site and scope;
    6. the items table;
    7. the totals;
    8. the amount in words;
    9. the terms;
    10. the signature.
  - **`buildQuotationPdf(supabase, id: string): Promise<{ buffer: Buffer; fileName: string; label: string } | null>`.** It is server-only. It reads the quotation, customer, items and settings, plus the logo bytes from storage when `logo_path` is a png or jpg. It returns null for a missing quotation.
  - **`GET /api/pdf/[doc]/[id]`** (`RouteContext<'/api/pdf/[doc]/[id]'>`):
    - It answers 401 with the action message for a missing or switched-off login. Logged-out browsers never reach it, because `src/proxy.ts` sends them to `/login`.
    - It answers 404 for any `doc` other than `quotation` (invoices and delivery notes come later), for an id that is not a GUID, and for a missing quotation.
    - Otherwise it answers 200 with `application/pdf`, `Content-Disposition: inline; filename="<fileName>"` and `Cache-Control: private, no-store`.
  - **The quotation page** gets a `PDF` link to `/api/pdf/quotation/<id>`, with `target="_blank"`.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/quotation-pdf.test.ts
import { describe, expect, it } from 'vitest'
import { renderQuotationPdf } from '@/modules/quotations/pdf-document'
import { quotationPdfModel, type QuotationPdfSource } from '@/modules/quotations/pdf-model'

const source: QuotationPdfSource = {
  quoteNo: 'QT/2026-27/0007', revision: 1, quoteDate: '2026-11-02', validUntil: '2026-11-17', title: 'Warehouse shed 40x80',
  siteAddress: 'Plot 12, IDA Jeedimetla', scope: 'Shed with sheeting', terms: '50% advance\nBalance on completion',
  gstRate: null, subtotal: 115000, gstAmount: 0, roundOff: 0, grandTotal: 115000,
  customer: { name: 'Sharma Steel Traders', address: '4-1-12 Abids', city: 'Hyderabad', state: 'Telangana', pincode: '500001', phone: '9876543210', gstin: null },
  items: [{ description: 'Supply, fabrication and erection as per scope of work', hsnSac: null, qty: 1, unit: 'job', rate: 115000, amount: 115000 }],
  workshop: { name: 'Sri Sai Fabricators', address: 'Plot 7, IDA Bollaram', city: 'Hyderabad', state: 'Telangana', pincode: '502325',
    phone: '9000000001', email: null, gstEnabled: false, gstin: null },
}

describe('quotation PDF', () => {
  it('shapes what the customer sees', () => {
    const model = quotationPdfModel(source)
    expect(model).toMatchObject({
      number: 'QT/2026-27/0007-R1', date: '02-11-2026', validUntil: '17-11-2026', subject: 'Warehouse shed 40x80',
      amountInWords: 'Rupees One Lakh Fifteen Thousand Only', terms: ['50% advance', 'Balance on completion'],
      signature: 'For Sri Sai Fabricators',
      totals: [{ label: 'Subtotal', value: '₹1,15,000.00' }, { label: 'Grand total', value: '₹1,15,000.00' }],
    })
    expect(model.items[0]).toMatchObject({ no: 1, qty: '1', unit: 'job', rate: '₹1,15,000.00', amount: '₹1,15,000.00' })
    expect(model.workshop.lines.join(' ')).not.toContain('GSTIN')
  })
  it('adds the GST line, the round off and the GSTIN when GST is on', () => {
    const model = quotationPdfModel({
      ...source, gstRate: 18, gstAmount: 20700, roundOff: 0.4, grandTotal: 135700.4,
      workshop: { ...source.workshop, gstEnabled: true, gstin: '36ABCDE1234F1Z5' },
    })
    expect(model.totals.map((t) => t.label)).toEqual(['Subtotal', 'GST @ 18%', 'Round off', 'Grand total'])
    expect(model.totals[1].value).toBe('₹20,700.00')
    expect(model.workshop.lines).toContain('GSTIN 36ABCDE1234F1Z5')
  })
  it('renders a PDF with the ₹ font embedded', async () => {
    const pdf = await renderQuotationPdf(quotationPdfModel(source), null)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pdf.toString('latin1')).toContain('NotoSans')
  })
})
```

```ts
// tests/e2e/quote-pdf.spec.ts
import { expect, test } from '@playwright/test'
import { OWNER, createTestCustomer, createTestQuotation, login } from './fixtures'

test('a quotation opens as a PDF for logged-in users only', async ({ page, playwright }) => {
  const customerId = await createTestCustomer({ name: 'PDF Test Traders' })
  const quote = await createTestQuotation({ customerId, title: 'PDF shed', items: [{ description: 'Shed', qty: 1, rate: 115000 }] })
  await login(page, OWNER)

  const res = await page.request.get(`/api/pdf/quotation/${quote.id}`)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toBe('application/pdf')
  expect(res.headers()['content-disposition']).toBe(`inline; filename="${quote.quoteNo.replaceAll('/', '-')}.pdf"`)
  expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-')

  expect((await page.request.get('/api/pdf/quotation/00000000-0000-0000-0000-000000000000')).status()).toBe(404)
  expect((await page.request.get(`/api/pdf/invoice/${quote.id}`)).status()).toBe(404)

  const visitor = await playwright.request.newContext({ baseURL: 'http://localhost:3000' })
  const anonymous = await visitor.get(`/api/pdf/quotation/${quote.id}`, { maxRedirects: 0 })
  expect(anonymous.status()).toBe(307)
  expect(anonymous.headers()['location']).toMatch(/\/login$/)
  await visitor.dispose()

  await page.goto(`/quotes/${quote.id}`)
  await expect(page.getByRole('link', { name: 'PDF' })).toHaveAttribute('href', `/api/pdf/quotation/${quote.id}`)
})
```

- [ ] **Step 2: Run `npm test`, then `npx supabase db reset && npx playwright test quote-pdf`.** Expected: the unit file FAILS (module not found) and the e2e FAILS (404 from the missing route).
- [ ] **Step 3: Add the dependency and fonts, then implement.**
  - Run `npm install @react-pdf/renderer@4.9.0`.
  - Fetch the fonts with `npm pack @expo-google-fonts/noto-sans@0.4.2` into a temporary folder, extract them, copy the three files, then delete the folder.
  - Implement the modules, the route, `next.config.ts` and the link.
- [ ] **Step 4: Run `npm test && npx supabase db reset && npx playwright test quote-pdf && npm run typecheck && npm run lint`.** Expected: all pass.
- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "feat: print quotations as PDFs with the amount in words"
```

---

### Task 7: Sharing a quotation on WhatsApp

**Files:**
- Create:
  - `src/lib/whatsapp.ts`;
  - `src/modules/files/share.ts`;
  - `src/modules/quotations/share-actions.ts`;
  - `src/modules/quotations/components/share-button.tsx`.
- Modify:
  - `src/modules/quotations/pdf-model.ts`: `quotationShareText`.
  - `src/app/(app)/quotes/[id]/page.tsx`.
- Test: `tests/unit/whatsapp.test.ts`, `tests/e2e/quote-share.spec.ts`

**Interfaces:**
- Consumes: Task 6's `buildQuotationPdf`, `safeFileName` (files), and `countStoredFiles` (fixtures).
- Produces:
  - **`whatsappUrl(phone: string | null, text: string): string`.**
    - With a phone: `https://wa.me/91<10 digits>?text=<encoded>`.
    - Without one: `https://wa.me/?text=<encoded>`.
  - **`quotationShareText(m: { workshopName: string; label: string; title: string; grandTotal: number }): string`.** It returns `Quotation <label> from <workshop> for <title>: <formatINR(grand total)>`.
  - **`storeSharedFile(supabase, target: { entityType: AttachmentEntityType; entityId: string }, fileName: string, body: Buffer, contentType: string): Promise<string>`.** It is server-only.
    - It uploads with `upsert: true` to `share/<entityType>/<entityId>/<safeFileName(fileName)>`.
    - It returns a signed URL valid for `SHARE_LINK_SECONDS = 604800`, which is 7 days.
  - **Server action `createQuotationShareLink(id: string): Promise<ActionResult<{ whatsappUrl: string }>>`.** It builds the PDF, stores it, and returns `whatsappUrl(customer phone, text + '\n' + signed URL)`.
  - **`<ShareOnWhatsApp quotationId fileName text />`.** It shows the button `Share on WhatsApp`.
    1. It fetches `/api/pdf/quotation/<id>` as a `File` named `fileName`.
    2. When `navigator.canShare?.({ files: [file] })`, it calls `navigator.share({ files: [file], text })`. A cancelled share, `AbortError`, is silent.
    3. Otherwise it calls `createQuotationShareLink` and runs `window.open(whatsappUrl, '_blank')`.
    4. Failures show the action message.
  - **The quotation page** shows the button for any quotation that is not replaced.

- [ ] **Step 1: Write the failing tests.**

```ts
// tests/unit/whatsapp.test.ts
import { expect, it } from 'vitest'
import { whatsappUrl } from '@/lib/whatsapp'
import { quotationShareText } from '@/modules/quotations/pdf-model'

it('opens a chat with the customer, or lets you pick one when there is no mobile', () => {
  expect(whatsappUrl('9876543210', 'Hello & welcome')).toBe('https://wa.me/919876543210?text=Hello%20%26%20welcome')
  expect(whatsappUrl(null, 'Hello')).toBe('https://wa.me/?text=Hello')
})
it('writes the share message', () => {
  expect(quotationShareText({ workshopName: 'Sri Sai Fabricators', label: 'QT/2026-27/0001-R1', title: 'Warehouse shed', grandTotal: 115000 }))
    .toBe('Quotation QT/2026-27/0001-R1 from Sri Sai Fabricators for Warehouse shed: ₹1,15,000.00')
})
```

```ts
// tests/e2e/quote-share.spec.ts
import { expect, test } from '@playwright/test'
import { OWNER, countStoredFiles, createTestCustomer, createTestQuotation, login } from './fixtures'

test.beforeEach(async ({ page }) => {
  await login(page, OWNER)
})

test('where the phone cannot share files, WhatsApp opens with a 7-day link to the PDF', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true })
    window.open = ((url: string) => { (window as unknown as { opened: string }).opened = url; return null }) as typeof window.open
  })
  const customerId = await createTestCustomer({ name: 'Share Test Traders', phone: '9876500111' })
  const quote = await createTestQuotation({ customerId, title: 'Share shed', items: [{ description: 'Shed', qty: 1, rate: 115000 }] })
  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Share on WhatsApp' }).click()

  await expect.poll(() => page.evaluate(() => (window as unknown as { opened?: string }).opened ?? '')).toMatch(/^https:\/\/wa\.me\/919876500111\?text=/)
  const opened = await page.evaluate(() => (window as unknown as { opened: string }).opened)
  const text = decodeURIComponent(opened.split('?text=')[1])
  expect(text).toContain(`Quotation ${quote.quoteNo} from`)
  expect(text).toContain('₹1,15,000.00')
  expect(text).toContain(`/storage/v1/object/sign/files/share/quotation/${quote.id}/`)
  expect(await countStoredFiles(`share/quotation/${quote.id}`)).toBe(1)

  await page.getByRole('button', { name: 'Share on WhatsApp' }).click()
  await expect.poll(() => countStoredFiles(`share/quotation/${quote.id}`)).toBe(1)
})

test('where the phone can share files, the PDF goes to the share sheet', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        ;(window as unknown as { shared: unknown }).shared = { names: data.files?.map((f) => f.name), types: data.files?.map((f) => f.type), text: data.text }
      },
    })
  })
  const customerId = await createTestCustomer({ name: 'Share Sheet Traders' })
  const quote = await createTestQuotation({ customerId, title: 'Sheet shed', items: [{ description: 'Shed', qty: 1, rate: 50000 }] })
  await page.goto(`/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Share on WhatsApp' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { shared?: unknown }).shared ?? null)).toEqual({
    names: [`${quote.quoteNo.replaceAll('/', '-')}.pdf`], types: ['application/pdf'],
    text: expect.stringContaining(`Quotation ${quote.quoteNo} from`),
  })
})
```

- [ ] **Step 2: Run `npm test`, then `npx supabase db reset && npx playwright test quote-share`.** Expected: the unit file FAILS (module not found) and the e2e FAILS (no `Share on WhatsApp` button).
- [ ] **Step 3: Implement** the helpers, the server file, the action, the button and the page change.
- [ ] **Step 4: Run `npm test && npx supabase db reset && npx playwright test quote-share && npm run typecheck && npm run lint`.** Expected: all pass.
- [ ] **Step 5: Run the whole suite: `npm run typecheck && npm run lint && npm test && npm run test:db && npm run test:e2e`.** Expected: every test passes, including stages 0–2. If the machine is short of memory, the e2e suite may be run in two halves, each after `npx supabase db reset`.
- [ ] **Step 6: Commit.**

```bash
git add -A && git commit -m "feat: share quotations on WhatsApp"
```

---

## Stage 3 done when

- All tests pass: `npm test`, `npm run test:db`, `npm run test:e2e`, `npm run lint` and `npm run typecheck`. That includes E10 (Task 1 unit and Task 2 pgTAP) and E11 (Task 1 unit).
- The owner checks on `localhost` that a real quotation can be:
  1. made, with a cost sheet and a margin;
  2. opened as a PDF;
  3. shared on WhatsApp;
  4. revised;
  5. accepted;
  6. made into a project.

  The phone check comes after stage 8, as the owner decided on 26-10-2026.
