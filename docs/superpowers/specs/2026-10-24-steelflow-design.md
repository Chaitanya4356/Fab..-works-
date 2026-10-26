# SteelFlow — Design Specification

| | |
|---|---|
| Date | 24-10-2026 |
| Status | Design approved in review; this written spec awaits sign-off |
| Repository | `Fab..-works-`, branch `dev` |
| Review page | https://claude.ai/artifact/D8UMK7rzvNaoZ88Wcga1LK |

This document is the source of truth for building SteelFlow. Each build stage gets its own step-by-step plan, written from this spec.

---

## 1. Purpose and success criteria

SteelFlow manages **one small steel fabrication workshop in India**: sheds, warehouses, roof trusses, staircases, platforms, structural steel, machine frames and custom work. It covers the full job, from customer enquiry to the profit summary.

It is **not** a SaaS product. There are no multiple workshops, tenants, subscriptions or payment gateway.

SteelFlow succeeds when:

1. The owner and staff can run a job end to end, from quotation to profit, from a phone.
2. The numbers are trustworthy. Stock, customer and supplier balances, and project profit are always worked out from recorded facts, and nothing is counted twice.
3. Nothing is typed twice. Data flows from quotation to project, invoice and profit.
4. Running cost is ₹0 a month on free plans, with the workshop's data backed up nightly.

---

## 2. Decisions and assumptions

### 2.1 Decided

| Topic | Decision |
|---|---|
| Hosting | Free plans only: Vercel Hobby, Supabase Free and GitHub Actions. The workshop says this is non-commercial use. |
| Stack | Next.js (App Router) + React + TypeScript + Tailwind CSS, Supabase (Postgres, Auth, Storage). |
| Architecture | A modular monolith: one app and one database, with a separate folder for each module. |
| Logins | Several users, all with full access. No roles or permissions. Workers do not log in. |
| GST | Built in but **switched off** (`settings.gst_enabled = false`). Purchase bills always record GST separately. While GST is off, purchase GST counts as cost. |
| Workers module | Profiles and project/activity assignments only. No payroll, salary processing, attendance, leave or statutory calculations. |
| Payments | Recorded by hand by a logged-in user. No online collection. |
| Language and format | English screens; ₹ in Indian grouping (₹1,00,000.00); dates as DD-MM-YYYY; time zone Asia/Kolkata. |

### 2.2 Assumptions (accepted in review)

1. Code lives in this repo on the `dev` branch, with the Next.js app at the repo root.
2. Document numbers restart every financial year (1 April to 31 March), e.g. `INV/2026-27/0001`.
3. Customers often pay advances before an invoice exists, and a project can have several invoices (running bills).
4. Steel is mostly bought by weight. Each material has one stock unit, with an optional kg-per-unit conversion.
5. WhatsApp sharing uses the phone's share sheet or a `wa.me` link. There is no WhatsApp Business API.
6. Reminders are dashboard alerts. There is no SMS, email or WhatsApp sending.

---

## 3. Scope

**MVP (stages 0 to 8):** customers and projects, workers, quotations, invoices and customer payments, materials and stock, suppliers, purchase bills and supplier payments, fabrication progress and dispatch, expenses and project profit, dashboard and Excel exports. See section 9.

**After the MVP, in an order the owner chooses:** Excel import (customers, workers, materials with opening stock, projects), purchase orders, an audit-history screen, weekly backup of uploaded files, and GST tools (credit notes, GST reports) for after registration.

**Not built unless requested later:** multiple workshops or tenants, subscriptions, a payment gateway, payroll/attendance/leave, user roles and permissions, offline mode, automatic SMS/email/WhatsApp messages, GST e-invoicing or return filing.

---

## 4. Architecture

### 4.1 Stack

| Concern | Choice |
|---|---|
| Framework | Next.js, current stable release at stage 0, App Router, TypeScript in strict mode |
| Styling | Tailwind CSS |
| Database | Supabase Postgres |
| Logins | Supabase Auth with email + password |
| Files | Supabase Storage, one private bucket `files` |
| Data access | `@supabase/supabase-js` with `@supabase/ssr`, using the logged-in user's session so database security rules apply |
| Validation | Zod schemas, shared by forms and server actions |
| PDFs | `@react-pdf/renderer`, generated in Next.js route handlers, with an embedded font that has the ₹ glyph (Noto Sans) |
| Excel | ExcelJS (`.xlsx`) |
| Tests | Vitest (calculations), pgTAP via `supabase test db` (database rules), Playwright (phone-screen flows) |
| Package manager | npm (Node 24 is installed) |

### 4.2 Hosting and environments

| Environment | Database | App | Used for |
|---|---|---|---|
| Local | Supabase running in Docker (`npx supabase start`) | `npm run dev` | Building and all automated tests |
| Test | Free Supabase project no. 2 | Vercel preview deployment of the `dev` branch | Trying a stage before it goes live; test data never mixes with real records |
| Live | Free Supabase project no. 1, Mumbai region (`ap-south-1`) | Vercel production deployment of `main` | Real daily use |

- Migrations live in `supabase/migrations/` and are applied to Test first, then Live after the owner approves a stage.
- A stage is released by merging `dev` into `main`, only after the owner approves it.

**Free-plan limits and how SteelFlow handles them.** Re-check the limits before going live.

| Limit | Handling |
|---|---|
| Supabase Free has no restorable backups | Nightly encrypted database backup through GitHub Actions (4.8), plus an "Export everything" Excel button (stage 8). |
| Supabase pauses a project after about 7 days without use | Daily use plus the nightly backup job's connection keep it active. |
| 1 GB file storage | Photos are shrunk on the device before upload (4.5). Files are capped at 10 MB each. Settings shows total storage used. |
| 500 MB database | Enough for years of text records. Settings shows database size. |
| Vercel rejects function request bodies over about 4.5 MB | Files upload straight from the browser to Supabase Storage using signed upload URLs, never through a Next.js function. |
| Very limited Supabase Auth email sending | No emails are needed. Users are created with a password by another user, and passwords are reset by another user. |
| Vercel Hobby cron runs at most once a day | No app cron jobs are needed. Reminders are worked out when the dashboard loads. |

### 4.3 Code layout and module boundaries

```
src/app/(auth)/login/            login screen
src/app/(app)/                   logged-in screens, one folder per module
src/app/api/pdf/[doc]/[id]/      PDF route handlers
src/app/api/export/[report]/     Excel export route handlers
src/modules/<module>/
    queries.ts                   server-side reads
    actions.ts                   server actions (writes)
    schema.ts                    Zod schemas and types
    components/                  module UI components
src/lib/
    supabase/                    server/browser clients
    money.ts  format.ts  dates.ts  fy.ts  words.ts
    pdf/  excel/  upload/
supabase/migrations/             tables, views, functions, policies
supabase/tests/                  pgTAP database tests
supabase/seed.sql                local development data
tests/unit/                      Vitest
tests/e2e/                       Playwright (phone viewport)
.github/workflows/               backup.yml, ci.yml
```

The modules are `settings`, `users`, `files`, `customers`, `suppliers`, `workers`, `quotations`, `projects`, `activities`, `dispatch`, `materials` (stock), `purchases`, `invoices`, `payments`, `expenses`, `dashboard` and `reports`.

**Boundary rule:** a module reads another module's data only through that module's exported query functions or through shared database views (6.3). It never queries another module's tables ad hoc.

### 4.4 Data access and security

- **Every table has Row Level Security on.** The helper `is_active_user()` returns true when `auth.uid()` belongs to a profile with `is_active = true`.
- **Ordinary tables:** active users may select, insert and update. No table allows delete, except the cases listed in 6.5.
- **Write-protected tables:** these are changed only through database functions (6.4). The functions are `SECURITY DEFINER`, check `is_active_user()`, and run each operation in one transaction. The tables are the stock ledger, offcuts, payments, allocations, document counters, the audit log, and the cached stock columns on `materials`.
- **Server actions** validate input with Zod, call Supabase as the logged-in user, and return either `{ ok: true, data }` or `{ ok: false, message, fieldErrors? }`.
- **The service-role key** is used only on the server, and only to create users, reset passwords, and ban/unban deactivated users. It is never sent to the browser.
- **Public sign-up is disabled** in Supabase Auth. The first user is created by a one-time setup script in stage 0. New users are added in Settings → Users. A login email does not have to receive mail, because accounts are created already confirmed.
- **Deactivating a user** sets `profiles.is_active = false` and bans the auth user, so existing sessions stop working.

### 4.5 Files and photos

- One private bucket `files`. The object path is `{entity_type}/{entity_id}/{uuid}-{safe_file_name}`.
- **Upload flow:**
  1. A server action checks the user and returns a signed upload URL.
  2. The browser uploads directly to Storage.
  3. A server action inserts the `attachments` row.
- **Images** (JPEG, PNG, WebP) are resized in the browser to at most 1600 px on the long side and re-encoded as JPEG at quality 0.75, aiming for 300 KB or less.
- **Other allowed types:** PDF, DWG and DXF (stored as-is, with no preview).
- **Maximum file size:** 10 MB.
- **Viewing:** files open through signed URLs that expire after 10 minutes.
- **Removing:** a wrongly uploaded file can be removed. Both the attachment row and the stored object are deleted, and the removal is recorded in the audit log.

### 4.6 PDFs, WhatsApp and Excel

- **PDFs** are produced for quotations, invoices and delivery notes by `GET /api/pdf/{quotation|invoice|delivery-note}/{id}`, for logged-in users only. Amounts use Indian grouping, and invoice and quotation totals are also written in words using the Indian system (lakh, crore).
- **WhatsApp sharing:**
  - Where the browser supports sharing files (`navigator.canShare({ files })`), the PDF is handed to the phone's share sheet.
  - Otherwise, the app creates a signed download link valid for **7 days** and opens `https://wa.me/91XXXXXXXXXX?text=…` with a short message containing the link. The number comes from the customer's record.
- **Excel exports** are `.xlsx` files created on the server by `GET /api/export/{report}`. Dates are written as real dates (DD-MM-YYYY display) and amounts as numbers.

### 4.7 Audit history

A generic trigger function `audit_row()` writes one `audit_log` row for each insert, update or delete. The row records the table, record id, action, user (`auth.uid()`), time, and the old and new values as JSON.

The trigger is attached to each of these tables in the stage that creates it: `settings`, `profiles`, `customers`, `suppliers`, `workers`, `quotations`, `projects`, `project_activities`, `materials`, `offcuts`, `purchase_bills`, `supplier_payments`, `invoices`, `customer_payments`, `payment_allocations`, `expenses` and `attachments`. The stock ledger is its own history, so it needs no trigger.

Nobody can update or delete `audit_log` rows. A screen to browse the history comes after the MVP; the data is recorded from stage 0.

### 4.8 Backups

`.github/workflows/backup.yml` runs every night at 02:00 IST (20:30 UTC). It:

1. Dumps the Live database (schema and data), using the repository secret `SUPABASE_DB_URL`.
2. Compresses the dump and encrypts it with `gpg --symmetric`, using the secret `BACKUP_PASSPHRASE`.
3. Uploads it as a workflow artifact with `retention-days: 14`.

The repository should be private. The dump is encrypted either way.

Before the owner relies on the app (Milestone A), one backup is decrypted and restored into the local database to prove that restores work. Uploaded files are not in this backup; a weekly files backup comes after the MVP.

### 4.9 Conventions

| Item | Rule |
|---|---|
| Money | `numeric(14,2)` in rupees. Calculations that decide stored amounts happen in SQL. TypeScript previews use integer paise to avoid floating-point errors. |
| Quantities | `numeric(14,3)` |
| Unit costs and rates | `numeric(14,4)` for stock unit costs; `numeric(14,2)` for document rates |
| Percentages | `numeric(5,2)` |
| Rounding | Half-up to the paisa on each line. Quotation and invoice grand totals are rounded to the nearest rupee, with the difference stored as `round_off`. |
| Today | Always Asia/Kolkata. SQL uses `(now() at time zone 'Asia/Kolkata')::date`. |
| Financial year | Starts 1 April. A date in April 2026 to March 2027 belongs to `2026-27`. |
| Document numbers | Each document type has its own format, set in Settings → Document numbers (7.11). The defaults give `PRJ/2026-27/0001`, `QT/…`, `INV/…`, `DN/…` and `PO/…`, restarting at 0001 every financial year. |
| When numbers are given | Projects, quotations, delivery notes and POs get a number when created. Invoices get a number only when **issued**, so invoice numbers have no gaps. |
| Phone numbers | Stored as 10-digit Indian mobile numbers. `+91` is added for WhatsApp links. |

### 4.10 Error handling

- **Database rule violations** (minus stock, overpaying an invoice, editing a locked document) are raised by the database functions with plain-language messages, e.g. `Only 80 m in stock. Record the purchase bill first, or do a stock count.` The server action passes the message to the screen unchanged.
- **Field errors** come from the Zod schema and show next to the field.
- **All-or-nothing:** every multi-row operation is one database function call, so a dropped connection never leaves partial data. If a save fails, the form keeps what the user typed.
- **Unexpected errors** are logged on the server and show `Something went wrong. Nothing was saved. Try again.`

### 4.11 Screens and navigation

- **Phones first.** A bottom bar with Home, Customers, Projects, Quotes, Money (invoices and payments) and More (workers, stock, suppliers, purchases, expenses, reports, settings). Wider screens get a side menu instead.
- **Touch and forms:** touch targets at least 44 px, numeric keyboards for amounts and quantities, and dates picked with the native date input.
- **Lists:** searchable by name, phone or document number, and paged 50 rows at a time.
- **Add to Home Screen:** a web app manifest and icons make this possible. There is no service worker and no offline mode.

---

## 5. Business workflow and module connections

```
Enquiry → Quotation → Acceptance → Project → Stock check → Purchase → Worker assignment
→ Fabrication progress → Quality check / rework → Dispatch → Invoice → Payments → Cost & profit
```

| Hand-off | What carries forward automatically |
|---|---|
| Customer → Quotation | Customer and site address. An enquiry is a Draft quotation with an `enquiry_date`. |
| Accepted quotation → Project | `convert_quotation()` creates the project: customer, title, site, scope (as the description), contract value (the quotation subtotal before GST), estimated cost per category (from the cost sheet), and a link back to the quotation. Its files show on the project. From stage 6 it also creates the standard activity list. |
| Project → Stock check | The quotation's material cost lines (those linked to a material) are compared with stock on hand, and shortfalls are listed. |
| Purchase bill → Stock or project | Material lines go into stock, or straight to a project. Expense lines charge a project. |
| Stock → Project | An issue moves stock value into the project's material cost. |
| Workers → Project and activities | Team membership and activity assignments. Assigning to an activity adds the worker to the project team. |
| Activities → Project progress | Project progress % is the average of its activities' progress. |
| Quality check → Rework | A failed quality check marks the chosen activity as Rework. |
| Dispatch → Delivery note | Each dispatch is a delivery note with a PDF. |
| Project → Invoice | Invoice lines are pre-filled from the accepted quotation's customer items, or from a dispatch, and can be edited. |
| Invoice → Payments | Payments are recorded against invoices, or held as an advance on the project. Balances and statuses are worked out. |
| Everything → Profit | `project_summary_v` combines contract value, estimates, actual costs, invoices and payments. |

---

## 6. Database

### 6.1 Conventions

- **Common columns.** Every business table has `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `created_by uuid references profiles`, `updated_at timestamptz` and `updated_by uuid references profiles`. A shared trigger fills the `*_by` and `updated_at` columns. These columns are omitted from the lists below.
- **Statuses and types** are `text` columns with `CHECK` constraints, not Postgres enums, so they are easy to extend.
- **Columns are `text` unless a type is given.** "Required" means `NOT NULL`.

### 6.2 Tables

**Setup and shared**

- `profiles`: `id uuid` primary key, equal to `auth.users.id`; `full_name` (required); `phone`; `login_email`; `is_active boolean` default true.
- `settings`: a single row, with `id smallint` primary key and `CHECK (id = 1)`.
  - Workshop details: `workshop_name`, `address`, `city`, `state`, `state_code`, `pincode`, `phone`, `email`, `logo_path`.
  - Bank and UPI details for invoices: `bank_name`, `bank_account_name`, `bank_account_no`, `bank_ifsc`, `upi_id`.
  - GST: `gst_enabled boolean` default false, `gstin`, `gst_registered_from date`, `default_gst_rate numeric(5,2)` default 18.
  - Defaults: `default_margin_percent numeric(5,2)` default 15, `quotation_validity_days int` default 15, `invoice_due_days int` default 15, `quotation_terms`, `invoice_terms`.
- `doc_number_formats`: one row per document type, changed only through `save_doc_number_formats` (6.4).
  - Columns: `doc_type` (project, quotation, invoice, dispatch, po; unique), `prefix` (required, stored in capitals, unique ignoring case), `separator` (`/`, `-` or empty), `year_style` (full, short, none) default full, `digits smallint` (1–8) default 4.
  - Default rows: `PRJ`, `QT`, `INV`, `DN` and `PO`, each with `/`, full year and 4 digits.
- `doc_counters`: write-protected; active users may read it.
  - Columns: `doc_type`, `series`, `last_number int`, `highest_issued int` default 0. Primary key `(doc_type, series)`.
  - `series` is the financial year (e.g. `2026-27`), or `all` when the format shows no year.
  - `last_number` is the last number given out, or the chosen next number minus one.
- `attachments`: `entity_type` (customer, supplier, worker, project, quotation, activity_update, purchase_bill, dispatch, expense), `entity_id uuid` (required), `file_path` (required), `file_name`, `mime_type`, `size_bytes int`, `caption`.
- `audit_log`: `id bigint generated always as identity`, `table_name`, `record_id uuid`, `action` (INSERT, UPDATE, DELETE), `changed_by uuid`, `changed_at timestamptz`, `old_values jsonb`, `new_values jsonb`. It has no common columns and is write-protected.

**People**

- `customers`: `name` (required), `contact_person`, `phone`, `alt_phone`, `email`, `address`, `city`, `state`, `pincode`, `gstin`, `notes`, `is_active boolean` default true.
- `suppliers`: the same columns as `customers`, plus `payment_terms_days int` default 30.
- `workers`: `full_name` (required), `phone`, `alt_phone`, `address`, `trade` (fitter, welder, fabricator, painter, helper, supervisor, other), `joining_date date`, `skills`, `experience_years numeric(4,1)`, `pay_type` (daily, hourly, monthly), `pay_rate numeric(12,2)`, `status` (active, inactive) default active, `emergency_contact_name`, `emergency_contact_phone`, `notes`.

**Quotations**

- `quotations`:
  - Identity: `quote_no` (required), `revision int` default 0, `customer_id` (required).
  - Details: `title` (required), `site_address`, `scope`, `terms`.
  - Dates: `enquiry_date date`, `quote_date date`, `valid_until date`, `follow_up_date date`.
  - Status: `status` (draft, sent, accepted, rejected, superseded) default draft, `sent_at timestamptz`, `decided_at timestamptz`, `rejection_reason`.
  - Money: `margin_percent numeric(5,2)`, `gst_rate numeric(5,2)` (null while GST is off), `cost_total`, `subtotal`, `gst_amount`, `round_off`, `grand_total`, all `numeric(14,2)`.
  - Link: `project_id` (set on conversion).
  - Constraints: `UNIQUE (quote_no, revision)`, and at most one row per `quote_no` whose status is not superseded.
- `quotation_cost_lines`: `quotation_id` (required), `sort_order int`, `category` (material, labour, painting, transport, other), `material_id` (optional; this column and its foreign key are added in stage 5, when `materials` exists), `description` (required), `qty numeric(14,3)`, `unit`, `cost_rate numeric(14,2)`, `amount numeric(14,2)`.
- `quotation_items`: `quotation_id` (required), `sort_order int`, `description` (required), `hsn_sac`, `qty numeric(14,3)`, `unit`, `rate numeric(14,2)`, `amount numeric(14,2)`.

**Projects and fabrication**

- `projects`:
  - Identity: `project_no` (required, unique), `customer_id` (required), `quotation_id` (optional).
  - Details: `title` (required), `site_address`, `description`, `notes`.
  - Status and dates: `status` (planned, in_progress, on_hold, completed, cancelled) default planned, `start_date date`, `due_date date`, `completed_date date`.
  - Money: `contract_value numeric(14,2)`, and `est_material`, `est_labour`, `est_painting`, `est_transport`, `est_other`, each `numeric(14,2)` default 0.
- `project_activities`: `project_id` (required), `sort_order int`, `activity_type` (cutting, drilling, fitting, welding, painting, finishing, quality_check, dispatch, custom), `name` (required), `status` (not_started, in_progress, on_hold, done, rework) default not_started, `progress_percent int` (0–100) default 0, `planned_start date`, `planned_end date`, `actual_start date`, `actual_end date`, `delay_reason`, `notes`.
- `activity_updates`: `activity_id` (required), `update_date date` (required), `status`, `progress_percent int`, `note`, `is_rework boolean` default false, `rework_reason`. Photos are attachments with `entity_type = activity_update`.
- `project_workers`: `project_id` (required), `worker_id` (required), `role`, `from_date date`, `to_date date`, `notes`. A worker has at most one open (`to_date is null`) row per project.
- `activity_workers`: `activity_id` (required), `worker_id` (required), `UNIQUE (activity_id, worker_id)`.
- `dispatches`: `dn_no` (required, unique), `project_id` (required), `dispatch_date date` (required), `vehicle_no`, `driver_name`, `driver_phone`, `delivered_to`, `delivery_address`, `notes`.
- `dispatch_items`: `dispatch_id` (required), `sort_order int`, `description` (required), `qty numeric(14,3)`, `unit`, `weight_kg numeric(12,3)`.

**Materials, stock and purchasing**

- `materials`:
  - Description: `name` (required), `material_type` (plate, angle, channel, beam, tube, pipe, flat, round, sheet, consumable, other), `size` (e.g. `ISA 40×40×5`), `grade` (e.g. `IS 2062 E250`), `notes`, `is_active boolean` default true.
  - Units: `stock_unit` (kg, m, length, pcs, sheet, litre), `kg_per_unit numeric(12,4)` (optional), `standard_length_m numeric(8,2)` (optional; lets users issue "5 lengths").
  - Reorder: `reorder_level numeric(14,3)` default 0.
  - Cached values, write-protected and changed only by stock functions: `current_qty numeric(14,3)` default 0, `stock_value numeric(14,2)` default 0, `avg_cost numeric(14,4)` default 0.
- `stock_movements`: write-protected, with no common `updated_*` columns because rows are never updated.
  - Columns: `material_id` (required), `movement_date date` (required), `movement_type` (opening, receipt, issue, return, adjustment, scrap), `qty numeric(14,3)` (signed: + in, − out), `unit_cost numeric(14,4)`, `value numeric(14,2)` (signed), `project_id`, `purchase_bill_item_id`, `reverses_movement_id`, `reason`, `notes`.
  - Checks: issue has qty < 0 and a project; return has qty > 0 and a project; receipt has qty > 0 and a bill item; scrap has qty < 0 and a reason; adjustment has a reason; opening has qty > 0.
- `offcuts`: write-protected.
  - Columns: `material_id` (required), `size_text` (required, e.g. `1.5 m`), `qty numeric(14,3)` (in the material's stock unit), `weight_kg numeric(12,3)`, `unit_cost numeric(14,4)`, `value numeric(14,2)`, `from_project_id`, `location`, `status` (available, used, scrapped) default available, `used_on_project_id`, `used_date date`, `scrapped_date date`, `notes`.
- `purchase_orders` (after MVP): `po_no` (required, unique), `supplier_id` (required), `project_id`, `order_date date`, `expected_date date`, `status` (draft, ordered, partly_received, received, cancelled), `notes`.
- `purchase_order_items` (after MVP): `po_id` (required), `material_id`, `description`, `qty numeric(14,3)`, `unit`, `rate numeric(14,2)`, `received_qty numeric(14,3)` default 0.
- `purchase_bills`: `supplier_id` (required), `bill_no` (the supplier's number), `bill_date date` (required), `due_date date`, `po_id`, `status` (draft, posted, cancelled) default draft, `taxable_amount`, `gst_amount`, `round_off`, `total` (all `numeric(14,2)`), `gst_claimable boolean` (defaults to `settings.gst_enabled`), `notes`, `cancelled_reason`.
- `purchase_bill_items`:
  - Columns: `bill_id` (required), `sort_order int`, `line_type` (material, expense), `material_id` (required for material lines), `expense_category` (required for expense lines; values as in `expenses.category`), `description`, `qty numeric(14,3)` (in the stock unit for material lines), `unit`, `rate numeric(14,4)` (before GST, per unit), `amount numeric(14,2)`, `gst_rate numeric(5,2)` default 0, `gst_amount numeric(14,2)` default 0, `project_id`.
  - On an expense line, `project_id` names the project charged; null means workshop overhead. On a material line, a `project_id` means "send straight to project".
- `supplier_payments`: write-protected. `supplier_id` (required), `payment_date date` (required), `amount numeric(14,2)` (> 0), `method` (cash, bank_transfer, upi, cheque, other), `reference_no`, `purchase_bill_id`, `notes`, `is_void boolean` default false, `void_reason`, `voided_by`, `voided_at`.

**Invoices and payments**

- `invoices`:
  - Identity: `invoice_no` (unique; null until issued), `project_id` (required), `customer_id` (required).
  - Dates: `invoice_date date`, `due_date date`.
  - Status: `status` (draft, issued, cancelled) default draft, `issued_at timestamptz`, `cancelled_reason`, `cancelled_at timestamptz`.
  - GST: `gst_enabled boolean` (a snapshot taken at issue), `place_of_supply_state`, `cgst_amount`, `sgst_amount`, `igst_amount` (default 0).
  - Money: `subtotal`, `round_off`, `total`, all `numeric(14,2)`.
  - Other: `notes`.
- `invoice_items`: `invoice_id` (required), `sort_order int`, `description` (required), `hsn_sac`, `qty numeric(14,3)`, `unit`, `rate numeric(14,2)`, `amount numeric(14,2)`, `gst_rate numeric(5,2)` default 0.
- `customer_payments`: write-protected. `customer_id` (required), `project_id`, `payment_date date` (required), `amount numeric(14,2)` (> 0), `method` (cash, bank_transfer, upi, cheque, other), `reference_no`, `notes`, `is_void boolean` default false, `void_reason`, `voided_by`, `voided_at`.
- `payment_allocations`: write-protected. `payment_id` (required), `invoice_id` (required), `amount numeric(14,2)` (> 0).

**Expenses**

- `expenses`: `expense_date date` (required), `project_id` (null means workshop overhead), `category` (material, consumables, labour, painting, transport, other), `description` (required), `amount numeric(14,2)` (> 0), `worker_id`, `qty numeric(10,2)`, `qty_unit` (days, hours), `rate numeric(12,2)`, `payment_method` (cash, bank_transfer, upi, cheque, other), `notes`, `is_void boolean` default false, `void_reason`.
  - `material` here means material **not** taken from stock.
  - Contract labour goes under `labour`, and a painting contractor under `painting`.

### 6.3 Views

All of these are calculated and never typed in.

| View | Gives |
|---|---|
| `stock_summary_v` | Each material's `current_qty`, `avg_cost`, `stock_value`, weight (qty × kg_per_unit), and `is_low` (`reorder_level > 0 and current_qty <= reorder_level`) |
| `invoice_balances_v` | Each invoice's `paid` (sum of allocations from non-void payments), `balance`, and `display_status` (see 7.5) |
| `customer_balances_v` | Each customer's invoiced (issued invoices only), paid, outstanding, overdue amount, and advances held |
| `project_advances_v` | Each project's unapplied advance: non-void payments with that `project_id`, less their allocations |
| `supplier_bill_balances_v` | Each posted bill's paid amount and balance. Payments that name the bill count first; on-account payments clear the oldest bills first, by `bill_date` then `created_at`. |
| `supplier_balances_v` | Each supplier's billed, paid, outstanding, overdue, and due within 7 days |
| `project_costs_v` | `project_id`, `bucket` (material, labour, painting, transport, other) and `amount`, built from the sources in 7.8 |
| `project_summary_v` | Each project's contract value, estimate and actual per bucket, remaining per bucket, forecast cost, estimated / forecast / final profit, invoiced (before GST), received, outstanding, and progress % |
| `worker_assignments_v` | Active workers with their open project assignments and activities not yet done |

### 6.4 Database functions

Every write that touches more than one row, or a write-protected table, goes through one of these functions. Each checks `is_active_user()` and runs as one transaction.

| Area | Functions |
|---|---|
| Numbering | `next_doc_number(doc_type, doc_date)` takes the next number in the right series and returns it formatted (7.11). `save_doc_number_formats(formats jsonb, as_of date)` saves formats and any new next numbers in one step. |
| Quotations | `create_quotation_revision(quotation_id)`, `set_quotation_status(quotation_id, status, reason)`, `convert_quotation(quotation_id)` |
| Stock | `record_opening_stock`, `issue_to_project`, `return_from_project`, `record_stock_count` (creates adjustments), `scrap_stock`, `reverse_movement` |
| Offcuts | `create_offcut(material_id, project_id, qty, size_text, weight_kg, location)`, `use_offcut(offcut_id, project_id)`, `scrap_offcut(offcut_id, reason)` |
| Purchases | `post_purchase_bill(bill_id)`, `cancel_purchase_bill(bill_id, reason)`, `record_supplier_payment`, `void_supplier_payment` |
| Invoices | `issue_invoice(invoice_id)`, `cancel_invoice(invoice_id, reason)` |
| Customer payments | `record_customer_payment(customer_id, project_id, date, amount, method, reference, notes, allocations jsonb)`, `apply_advance(payment_id, invoice_id, amount)`, `void_customer_payment(payment_id, reason)` |
| Activities | `add_activity_update(activity_id, …)` inserts the update and sets the activity's current status, progress and dates |
| Workers | Assigning a worker to an activity adds an open `project_workers` row if none exists (trigger) |

### 6.5 Changes and deletes

- **No deletes, by default.** Ordinary tables have no delete policy. Records are deactivated (`is_active`, `status`), cancelled or voided instead.
- **Allowed deletes:**
  - Line items of Draft quotations, invoices and purchase bills. A trigger blocks any line change once the parent is not Draft.
  - Attachments, as described in 4.5.
  - Payment allocations, removed only by `cancel_invoice` and `void_customer_payment`, and recorded in the audit log.
- **Locked documents:** a quotation that is no longer Draft can only change status and follow-up date. An issued invoice and a posted purchase bill cannot be edited; they are cancelled and recreated instead.
- **Expenses** can be edited (the audit log keeps every change) and are voided rather than deleted.

---

## 7. Business rules

### 7.1 Quotations

- **Margin is added on top of cost.** At 15%, a cost of ₹1,00,000 gives a price of ₹1,15,000. The screen shows the profit both as an amount and as a % of price.
- **Cost sheet** lines are grouped by category, and `cost_total` is the sum of their amounts.
- **"Generate from cost sheet"** builds the customer items in one of two ways:
  - **Itemised:** one item per cost line, with `rate = cost_rate × (1 + margin%)`.
  - **Lump sum:** one item, "Supply, fabrication and erection as per scope of work", qty 1, unit `job`, with `rate = cost_total × (1 + margin%)`.
  
  Either way, the items stay editable. The screen shows the actual profit as `subtotal − cost_total`.
- **Totals:** `subtotal` is the sum of item amounts. GST is added when enabled. `grand_total` is rounded to the rupee, with the difference in `round_off`.
- **Status flow:** Draft → Sent → Accepted or Rejected.
  - Draft quotations can be edited freely.
  - Sent, Accepted and Rejected quotations are locked.
  - Revising a Sent or Rejected quotation copies it, with its lines, into revision + 1 as a Draft, and marks the old revision Superseded.
  - An accepted quotation is converted, not revised.
- **Follow-ups:** a Sent quotation whose `follow_up_date` is today or earlier appears in dashboard reminders.
- **Conversion** works only for Accepted quotations, at most once. Each project estimate bucket is the sum of that category's cost lines.
- **The PDF** shows the customer items only, never the cost sheet or margin.

### 7.2 Projects and progress

- A project's status is set by hand.
- **Progress %** is the plain average of its activities' `progress_percent`. It is 0 when there are no activities.
- **Overdue:**
  - A project is overdue when `due_date < today` and its status is not completed or cancelled.
  - An activity is overdue when `planned_end < today` and its status is not done.
- **Standard activity list** (from stage 6), created on new and converted projects: Cutting, Drilling, Fitting, Welding, Painting, Finishing, Quality check, Dispatch. Custom activities can be added, removed while not started, and reordered.
- **Rework:** an update on the Quality check activity can be recorded as failed, with a reason and the activity that needs rework. That activity's status becomes Rework, and the update is flagged `is_rework`. Updating the activity to Done clears it.

### 7.3 Stock

- **Units.** Each material has one stock unit. The suggested defaults are metres for angles, channels, beams, tubes and pipes; kg for plates; and pcs, kg or litres for consumables.
  - Entry screens accept kg, converted using `kg_per_unit`.
  - When `standard_length_m` is set, entry screens also accept a number of lengths.
- **Average cost.** `avg_cost = stock_value / current_qty` while qty > 0. When qty reaches 0, the last average is kept.
- **Receipt** (posting a material line on a bill): qty and value are added. The unit cost is the bill rate, plus the line's GST share when `gst_claimable = false`.
- **Issue:** the value is `qty × avg_cost`, rounded to paise. When the issue takes all remaining stock, the value is exactly the remaining `stock_value`, so no paise are left behind.
- **Send straight to project:** a receipt and an issue are recorded in one step, both at the bill's unit cost. The average cost of the rest of the stock is unchanged.
- **Return:** goes back at the project's average issue rate for that material, and reduces the project's material cost.
- **Stock count:** the user enters the counted quantities. Each difference becomes an adjustment at the current average cost, with a reason.
- **Scrap** (damaged or rusted stock): leaves at the current average cost, with a reason. It is workshop overhead and is not charged to a project.
- **Minus stock is refused.** An issue, scrap or negative adjustment larger than `current_qty` is refused with: `Only {qty} {unit} in stock. Record the purchase bill first, or do a stock count.`
- **Reversal:** `reverse_movement` adds an opposite row at the same unit cost and links it to the original. Movements are never updated or deleted. Reversing a receipt follows the minus-stock rule.
- **Offcuts:**
  - A reusable piece is recorded against the project it came from, valued at its qty × the project's issue rate. The project gets that value as a credit.
  - When an offcut is used on a project, that project is charged its value.
  - Offcuts are not part of `current_qty`.
  - A scrapped offcut's value becomes workshop overhead.
  - Unusable short bits are scrap and get no credit.
- **Low stock:** a material is low when `reorder_level > 0` and `current_qty <= reorder_level`.

### 7.4 Purchases and supplier payments

- **Drafts and posting.** A bill is saved as Draft and can be edited until it is posted. Posting creates the receipt (and any straight-to-project issue) movements, and locks the bill.
- **Cancelling** a posted bill reverses its movements, which needs enough stock, and keeps the bill as Cancelled with a reason.
- **Due date** defaults to `bill_date + supplier.payment_terms_days`.
- **Expense lines** with a project are project costs (7.8); those without one are workshop overhead. If GST is not claimable, they include their GST.
- **Payments** can name a bill or be paid on account. Wrong payments are voided with a reason and stay in the history.
- **Supplier balance** = posted bill totals − non-void payments. Bill-level balances follow the order in `supplier_bill_balances_v`.

### 7.5 Invoices and customer payments

- **Drafts and issuing.** Drafts have no number and can be edited. `issue_invoice` assigns the next number, takes the GST snapshot and locks the invoice.
- **Due date** defaults to `invoice_date + settings.invoice_due_days`.
- **Pre-fill.** A new invoice offers to copy lines from the accepted quotation's items. From stage 6 it can also copy them from a dispatch.
- **GST (when enabled).** Calculated per line.
  - Customer's `state` the same as the workshop's (or blank): CGST and SGST at half the rate each.
  - Otherwise: IGST at the full rate.
  - While GST is off, no GST appears on the invoice and the PDF title is "Invoice" rather than "Tax Invoice".
- **Total** = subtotal + GST, rounded to the rupee, with `round_off` holding the difference.
- **Display status**, worked out from the data and never typed in, in this order:
  1. `draft` or `cancelled`, from `status`
  2. `paid` when the balance is 0
  3. `overdue` when the balance is above 0 and `due_date < today`
  4. `partially_paid` when the paid amount is above 0
  5. `unpaid` otherwise
- **Record Payment** (on an invoice): the amount defaults to the balance, and the method, date, reference and notes are entered.
  - The payment is allocated to that invoice, up to its balance.
  - Any extra stays as an advance on the project.
  - From a customer or project, one payment can be split across several issued invoices. Oldest-first is suggested and can be edited.
- **Allocation limits:** the total allocated from a payment can't exceed its amount. The total allocated to an invoice can't exceed its total. Only issued invoices of the same customer can receive allocations.
- **Advances:** a payment recorded on a project with no allocation is an advance. When an invoice for that project is issued, the app offers to apply the advance.
- **Corrections:**
  - Payments are never edited or deleted. `void_customer_payment` marks one void with a reason, removes its allocations (which are audited), and leaves it visible but struck through.
  - The right payment is then recorded again.
  - A bounced cheque is voided the same way.
- **Cancelling an issued invoice** needs a reason. Its allocations are removed, so that money returns to the project as an advance. The invoice keeps its number, and a corrected invoice gets a new one.

### 7.6 Workers and labour

- Worker records are separate from customers and suppliers.
- Inactive workers are hidden from pickers, but their history stays. Workers are never deleted.
- A worker may be on several projects at once, and the picker shows their other current projects.
- **Assignments carry no cost.**
- **Labour cost comes only from labour expenses** (`category = labour`):
  - With a worker: `amount = qty × rate`, where qty is in days or hours.
  - The rate is pre-filled from the worker's wage: daily → `pay_rate` per day; hourly → `pay_rate` per hour; monthly → `pay_rate / 26` per day. It can be edited.
  - Contract labour is one labour expense with no worker.
- There is no payroll. Salaries are not recorded as payments, so labour reaches projects only through labour entries.
- A worker's profile shows their project assignments, activity assignments and labour entries.

### 7.7 Expenses

- An expense with a `project_id` is a project cost. Without one, it is workshop overhead, shown in reports but not in project profit.
- Voided expenses are excluded from every total.

### 7.8 Project cost and profit

**One source per cost.** Each cost bucket is built only from these sources:

| Bucket | Sources |
|---|---|
| material | − value of issue movements (i.e. the positive cost) − value of return movements + value of offcuts used on the project − value of offcuts credited from the project + expenses and bill expense lines in categories `material` and `consumables` |
| labour | Expenses and bill expense lines in category `labour` |
| painting | Expenses and bill expense lines in category `painting` |
| transport | Expenses and bill expense lines in category `transport` |
| other | Expenses and bill expense lines in category `other` |

Only non-void expenses and lines of posted bills count.

**Never counted:**
- Purchase bills for stock material, which only add to stock.
- Worker assignments.
- Payments, which only settle invoices.

**GST in profit:**
- Income is issued (not cancelled) invoices' `total − cgst − sgst − igst`.
- Purchase GST is included in cost only when the bill is not claimable.

**Figures in `project_summary_v`:**

- `estimated_cost` = sum of the `est_*` buckets.
- `estimated_profit` = `contract_value − estimated_cost`.
- `actual_cost` = sum of the actual buckets.
- `remaining` per bucket = `greatest(est − actual, 0)`. A bucket where actual is more than the estimate is flagged as an overrun.
- `forecast_cost` = `actual_cost + sum(remaining)`.
- `forecast_profit` = `contract_value − forecast_cost`.
- `final_profit`, once the project is completed, = income − `actual_cost`.
- `invoiced`, `received` and `outstanding` are shown alongside and never mixed into profit.
- Profit % is shown as a % of contract value.

### 7.9 Dashboard and reminders

**Home screen at stage 4:** quotations awaiting a decision, and unpaid or overdue invoices.

**Full dashboard at stage 8:**
- Active projects with their progress
- Upcoming deadlines (due within 7 days) and overdue ones, for projects and activities
- Quotations awaiting a decision, and follow-ups due
- Low-stock materials
- Active workers and their current assignments
- Total customer outstanding and advances held
- Recent customer payments (last 10)
- Supplier bills overdue or due within 7 days
- Project cost and profit, estimate against forecast

**Reminders** are the "Needs attention" list on the dashboard: overdue projects and activities, follow-ups due, low stock, overdue invoices, and supplier bills due. They are worked out each time the dashboard loads.

### 7.10 Reports and exports (stage 8)

Each export is an `.xlsx` file, with date-range filters where relevant:

- Projects summary
- Project profit
- Outstanding invoices, with ageing (0–30, 31–60, 61–90 and 90+ days)
- Customer ledger
- Supplier ledger
- Stock summary and valuation
- Stock movement register
- Material use by project
- Expenses by category
- Worker assignments
- Payments received register

"Export everything" produces one workbook with a sheet per main table.

### 7.11 Document numbers

- **Format.** Each document type has a prefix, a separator, a year style and a number of digits. The number is the prefix, the year part (if any) and the sequence, joined by the separator.
  - Year styles: full `2026-27`, short `26-27`, or none.
  - The sequence is padded with zeros to the chosen digits but never cut short. With 3 digits, 999 is followed by 1000.
- **Series.** When the format shows a year, numbering restarts at 1 every 1 April, with one counter per financial year. With no year, numbering carries on across years and never restarts, so no number repeats.
- **Next number.** Settings shows the next number for the current series and lets you change it, for example to carry on from a paper bill book.
  - It cannot be set at or below a number already given out in that series: `Invoice numbers up to 245 have already been used. The next number must be 246 or higher.`
  - A next number set too high by mistake can be lowered again, as long as nothing has been numbered since.
- **Prefixes.** 1–10 characters: letters, digits, `-` and `/`, starting with a letter or digit, stored in capitals. Each document type needs its own prefix.
- **Preview.** The Settings screen shows the next number in full as you type.
- **GST limit.** A GST invoice number may have at most 16 characters, using only letters, digits, `-` and `/`. The default `INV/2026-27/0001` is exactly 16.
  - When GST is switched on, an invoice format whose next number would be longer is refused: `GST invoice numbers can have at most 16 characters. This format makes 22.`
  - While GST is off, the same message shows as a warning.
- **Changes apply forward only.** Changing a format affects only numbers given out afterwards. Existing documents keep their numbers.

---

## 8. Worked examples (acceptance tests)

These examples must produce exactly these results. Each one becomes an automated test in its stage.

**E1. Average cost, issue and offcut (stage 5).** Material ISA 40×40×5, stock unit m, `kg_per_unit = 3.0`, `standard_length_m = 6`.

| Step | Qty | Rate | Value |
|---|---|---|---|
| Opening stock | 100 m | ₹183/m | ₹18,300.00 |
| Bill: 600 kg at ₹65/kg (GST not claimable; rate includes GST) | +200 m | ₹195/m | ₹39,000.00 |
| Stock after bill | 300 m | ₹191/m | ₹57,300.00 |
| Issue 5 lengths to Sharma shed | −30 m | ₹191/m | ₹5,730.00 |
| Offcut 1.5 m from Sharma shed | 1.5 m | ₹191/m | credit ₹286.50 |
| Sharma shed material cost for this angle | 28.5 m | | ₹5,443.50 |
| Main stock left | 270 m | ₹191/m | ₹51,570.00 |

**E2. Send straight to project (stage 5).** Starting from 300 m at ₹191/m (₹57,300), a bill line of 50 m at ₹200/m is sent straight to Sharma shed. The project is charged ₹10,000.00, and stock stays at 300 m at ₹191/m (₹57,300).

**E3. Minus stock is refused (stage 5).** With 80 m on hand, issuing 81 m is refused with `Only 80 m in stock. Record the purchase bill first, or do a stock count.`, and nothing changes.

**E4. Return (stage 5).** Returning 2 m of the angle from Sharma shed (issued at ₹191/m) adds 2 m at ₹191/m to stock and reduces the project's material cost by ₹382.00.

**E5. Simple invoice payments (stage 4).**
- A ₹1,00,000 invoice with ₹30,000 paid shows paid ₹30,000, balance ₹70,000, status Partially Paid.
- After ₹70,000 more is recorded, it shows balance ₹0 and status Paid.

**E6. Advance and overdue (stage 4).**

| Date | Event | Paid | Balance | Status |
|---|---|---|---|---|
| 01-10-2026 | ₹1,00,000 advance on Sharma shed, by bank transfer | — | — | Advance held ₹1,00,000 |
| 05-11-2026 | INV/2026-27/0007 issued for ₹3,00,000, due 20-11-2026; advance applied | ₹1,00,000 | ₹2,00,000 | Partially Paid |
| 12-11-2026 | ₹1,30,000 by UPI | ₹2,30,000 | ₹70,000 | Partially Paid |
| 21-11-2026 | Due date has passed | ₹2,30,000 | ₹70,000 | Overdue |
| 28-11-2026 | ₹70,000 by cheque | ₹3,00,000 | ₹0 | Paid |

**E7. Voiding a wrong payment (stage 4).** A payment typed as ₹7,000 instead of ₹70,000 is voided with the reason "wrong amount". The balance returns to its value before that payment, and the voided payment stays in the history. Then ₹70,000 is recorded.

**E8. Labour entry (stage 7).** Ramesh, welder, `pay_type = daily`, `pay_rate = 900`. A 4-day labour entry on Sharma shed adds ₹3,600.00 to its labour bucket. His assignment to Sharma shed and its Welding activity adds ₹0.

**E9. Project profit (stage 7).** Sharma shed has a contract value of ₹5,00,000.

| Bucket | Estimate | Actual | Remaining |
|---|---|---|---|
| Material | ₹2,60,000 | ₹2,72,000 (overrun ₹12,000) | ₹0 |
| Labour | ₹80,000 | ₹45,000 | ₹35,000 |
| Painting | ₹25,000 | ₹0 | ₹25,000 |
| Transport | ₹15,000 | ₹6,000 | ₹9,000 |
| Other | ₹10,000 | ₹4,000 | ₹6,000 |
| **Total** | **₹3,90,000** | **₹3,27,000** | **₹75,000** |

- Estimated profit: ₹1,10,000 (22.0%).
- Forecast cost: ₹4,02,000.
- Forecast profit: ₹98,000 (19.6%).
- With ₹3,00,000 invoiced and ₹2,30,000 received, outstanding is ₹70,000, and profit is unchanged by payments.

**E10. Quotation margin (stage 3).** A cost sheet totalling ₹1,00,000 with a 15% margin and a lump-sum item gives a subtotal of ₹1,15,000. Profit is ₹15,000, which is 13.04% of the price.

**E11. Amount in words (stage 3).** ₹1,20,000 is written "Rupees One Lakh Twenty Thousand Only". ₹2,35,50,075.50 is written "Rupees Two Crore Thirty Five Lakh Fifty Thousand Seventy Five and Fifty Paise Only".

**E12. Financial-year numbering (stage 0 for `next_doc_number`; the draft rule is tested in stage 4).**
- An invoice number taken on 31-03-2027 is the next `INV/2026-27/` number.
- The first invoice number taken on 01-04-2027 is `INV/2027-28/0001`.
- Draft invoices consume no numbers.

**E13. GST split (stage 4, with GST enabled in a test).** For a ₹1,00,000 subtotal at 18%:
- Customer in the same state: CGST ₹9,000 + SGST ₹9,000.
- Customer in another state: IGST ₹18,000.
- Total ₹1,18,000 in both cases.

**E14. Number formats (stage 0), working on 24-10-2026.**
- An invoice format of prefix `SBF`, separator `/`, full year, 3 digits and next number 246 gives `SBF/2026-27/246`, then `SBF/2026-27/247`.
- A quotation format of `SBF-Q`, separator `-`, short year and 4 digits gives `SBF-Q-26-27-0001`.
- Setting the invoice next number to 200 is then refused with `Invoice numbers up to 247 have already been used. The next number must be 248 or higher.`
- A PO format with no year numbers a PO on 31-03-2027 as `PO/0001`, and the next one on 01-04-2027 as `PO/0002`.
- With 3 digits, invoice 999 is followed by `SBF/2026-27/1000`.
- With GST switched on, an invoice prefix of `SBFAB-INV` (making `SBFAB-INV/2026-27/0001`, 22 characters) is refused.

---

## 9. Build stages

Each stage follows the same steps:

1. A written plan.
2. Database migration and its database tests.
3. Screens.
4. All automated tests pass, including earlier stages'.
5. The owner checks the stage's **done when** on a phone.
6. Commit on `dev`, then release to Live after approval.

| Stage | Builds | Done when |
|---|---|---|
| **0. Foundation** (L) | Next.js app; Supabase local/test/live; login; Settings → Users (add, deactivate, reset password); Settings (workshop, logo, bank/UPI, GST switch off, document number formats); phone layout and manifest; `doc_number_formats`, `doc_counters`, `next_doc_number` and `save_doc_number_formats`; `audit_log` + trigger; `attachments` + upload with image shrinking; nightly backup workflow; CI workflow; Vercel deploys | The owner opens the Vercel link on a phone, logs in, adds a second user and fills in Settings, including the document number formats. E12 and E14 pass. |
| **1. Customers and projects** (M) | `customers`, `projects`; list, search, create, edit, deactivate; project page with tabs; project files | A real customer and project are added and a drawing is attached from a phone |
| **2. Workers** (S) | `workers`, `project_workers`; profiles, search, deactivate, documents; project team | Workers are entered and a project page shows its team |
| **3. Quotations** (L) | `quotations`, `quotation_cost_lines`, `quotation_items`; cost sheet, margin, generate items, totals, statuses, revisions, follow-ups; quotation PDF; WhatsApp share; `convert_quotation` (without activities); amount-in-words helper | A real quote is made, shared on WhatsApp, revised, accepted and converted. E10 and E11 pass. |
| **4. Invoices and payments** (L) | `invoices`, `invoice_items`, `customer_payments`, `payment_allocations`; balance/advance views; issue/cancel; invoice PDF; Record Payment, advances, splits, voids; payment history; customer balances; home screen | E5, E6, E7 and E13 pass, and the owner repeats E5 and E6 in the app |
| **Milestone A** | Restore-test one backup. Go live for quotations, invoices and payments. | |
| **5. Stock and suppliers** (L) | `suppliers`, `materials`, `stock_movements`, `offcuts`, `purchase_bills`, `purchase_bill_items`, `supplier_payments`; stock and supplier views; all stock, offcut and purchase functions; stock count; low stock; project stock check; link quotation material lines | E1–E4 pass |
| **6. Fabrication progress and dispatch** (M) | `project_activities`, `activity_updates`, `activity_workers`, `dispatches`, `dispatch_items`; standard activity list (also added to `convert_quotation`); updates with photos; rework; project progress; delivery note PDF | Welding progress is updated with a photo from a phone, and a delivery note is shared |
| **7. Expenses and profit** (M) | `expenses`; labour entries with pre-filled rates; `project_costs_v`, `project_summary_v`; project cost and profit screen with overrun flags | E8 and E9 pass |
| **8. Dashboard and reports** (M) | Full dashboard (7.9); `worker_assignments_v`; Excel exports (7.10); "Export everything" | The dashboard matches the data, and every export opens in Excel |
| **Milestone B** | MVP complete | |

After the MVP: Excel import (with a preview and per-row errors before saving), purchase orders, audit history screen, weekly files backup, and GST tools.

---

## 10. Testing strategy

| Layer | Tool | Covers | Runs |
|---|---|---|---|
| Calculations | Vitest | `money`, `format` (Indian grouping), `words` (amount in words), `fy` (financial year and numbering format), quotation totals and margin, GST split, invoice display status, forecast profit | Locally and in CI on every push to `dev` |
| Database rules | pgTAP (`supabase test db`) | Every function in 6.4, the minus-stock and allocation limits, write protection (direct inserts into protected tables fail), views, and the worked examples in section 8 | Locally and in CI (`.github/workflows/ci.yml` starts Supabase in Docker) |
| Phone-screen flows | Playwright, at a 390×844 viewport | Each stage's main flow, against local Supabase with seed data | Locally, before each stage sign-off |
| Owner check | The owner's own phone | The stage's **done when** | Before each release |

**Rules:**
- A stage is not complete until its worked examples pass as automated tests.
- Earlier stages' tests must keep passing.
- Test data lives in `supabase/seed.sql` and in the test files, never in Live.
