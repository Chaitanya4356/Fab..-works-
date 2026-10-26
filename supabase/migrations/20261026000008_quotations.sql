-- Stage 3: quotations (spec 6.2, 6.4, 6.5, 7.1). Quotations and their lines are written only through the
-- functions below, which compute every stored amount; users may change only the follow-up date directly.

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  quote_no text not null,
  revision int not null default 0 check (revision >= 0),
  customer_id uuid not null references public.customers (id),
  title text not null check (length(trim(title)) > 0),
  site_address text,
  scope text,
  terms text,
  enquiry_date date,
  quote_date date,
  valid_until date,
  follow_up_date date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'superseded')),
  sent_at timestamptz,
  decided_at timestamptz,
  rejection_reason text,
  margin_percent numeric(5,2) not null default 0 check (margin_percent >= 0),
  gst_rate numeric(5,2),
  cost_total numeric(14,2) not null default 0,
  subtotal numeric(14,2) not null default 0,
  gst_amount numeric(14,2) not null default 0,
  round_off numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  project_id uuid references public.projects (id),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  constraint quotations_valid_after_quote check (quote_date is null or valid_until is null or valid_until >= quote_date),
  constraint quotations_quote_no_revision_key unique (quote_no, revision)
);

-- Only one revision of a quotation number is live at a time; older ones are superseded.
create unique index quotations_one_live_revision_idx on public.quotations (quote_no) where status <> 'superseded';
create index quotations_customer_idx on public.quotations (customer_id);
create index quotations_status_follow_up_idx on public.quotations (status, follow_up_date);

create table public.quotation_cost_lines (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id),
  sort_order int not null,
  category text not null check (category in ('material', 'labour', 'painting', 'transport', 'other')),
  description text not null check (length(trim(description)) > 0),
  qty numeric(14,3) not null check (qty > 0),
  unit text,
  cost_rate numeric(14,2) not null check (cost_rate >= 0),
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index quotation_cost_lines_quotation_idx on public.quotation_cost_lines (quotation_id);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id),
  sort_order int not null,
  description text not null check (length(trim(description)) > 0),
  hsn_sac text,
  qty numeric(14,3) not null check (qty > 0),
  unit text,
  rate numeric(14,2) not null check (rate >= 0),
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index quotation_items_quotation_idx on public.quotation_items (quotation_id);

-- The link from a project back to the quotation it came from (stage 1 left this for now).
alter table public.projects add column quotation_id uuid references public.quotations (id);
create unique index projects_quotation_idx on public.projects (quotation_id) where quotation_id is not null;

-- project_list_v selects p.*, so it is rebuilt to pick up the new column. is_overdue is now never null.
drop view public.project_list_v;
create view public.project_list_v
with (security_invoker = true)
as
select
  p.*,
  c.name as customer_name,
  c.is_active as customer_is_active,
  coalesce(p.due_date < public.today_ist() and p.status not in ('completed', 'cancelled'), false) as is_overdue
from public.projects p
join public.customers c on c.id = p.customer_id;

-- The quotation list: live revisions only, with the customer's name and a follow-up flag.
create view public.quotation_list_v
with (security_invoker = true)
as
select
  q.id,
  q.quote_no,
  q.revision,
  q.customer_id,
  c.name as customer_name,
  q.title,
  q.status,
  q.quote_date,
  q.valid_until,
  q.follow_up_date,
  q.grand_total,
  q.project_id,
  coalesce(q.status = 'sent' and q.follow_up_date <= public.today_ist(), false) as is_follow_up_due
from public.quotations q
join public.customers c on c.id = q.customer_id
where q.status <> 'superseded';

create trigger quotations_row_meta before insert or update on public.quotations
  for each row execute function public.set_row_meta();
create trigger quotations_audit after insert or update or delete on public.quotations
  for each row execute function public.audit_row();
create trigger quotation_cost_lines_row_meta before insert or update on public.quotation_cost_lines
  for each row execute function public.set_row_meta();
create trigger quotation_items_row_meta before insert or update on public.quotation_items
  for each row execute function public.set_row_meta();

-- Lines may change only while their quotation is a draft (spec 6.5).
create function public.quotation_lines_locked()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_quotation_id uuid;
begin
  v_quotation_id := case when tg_op = 'DELETE' then old.quotation_id else new.quotation_id end;
  if (select status from public.quotations where id = v_quotation_id) is distinct from 'draft' then
    raise exception 'This quotation has been sent, so its lines can no longer be changed. Revise it to make changes.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger quotation_cost_lines_locked before insert or update or delete on public.quotation_cost_lines
  for each row execute function public.quotation_lines_locked();
create trigger quotation_items_locked before insert or update or delete on public.quotation_items
  for each row execute function public.quotation_lines_locked();

-- Saves a draft: its details and every line in one step, with all amounts worked out here (spec 4.9).
create function public.save_quotation_draft(p_quotation_id uuid, p_header jsonb, p_cost_lines jsonb, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_quotation_id;
  v_status text;
  v_current_customer uuid;
  v_customer_id uuid := (p_header ->> 'customer_id')::uuid;
  v_quote_date date := coalesce((p_header ->> 'quote_date')::date, public.today_ist());
  v_settings public.settings;
  v_cost numeric(14,2);
  v_subtotal numeric(14,2);
  v_gst_rate numeric(5,2);
  v_gst numeric(14,2);
  v_grand numeric(14,2);
begin
  if not public.is_active_user() then
    raise exception 'You need an active login to do this.' using errcode = '42501';
  end if;

  if v_id is not null then
    select status, customer_id into v_status, v_current_customer from public.quotations where id = v_id for update;
    if not found then
      raise exception 'This quotation could not be found.';
    end if;
    if v_status = 'superseded' then
      raise exception 'A newer revision of this quotation exists. Open it to make changes.';
    end if;
    if v_status <> 'draft' then
      raise exception 'This quotation has been sent, so it can no longer be edited. Revise it to make changes.';
    end if;
  end if;

  -- A switched-off customer cannot get a new quotation, but a draft may keep the customer it already has.
  if v_customer_id is distinct from v_current_customer
     and exists (select 1 from public.customers where id = v_customer_id and not is_active) then
    raise exception 'This customer is switched off. Switch them on before quoting.';
  end if;

  if v_id is null then
    insert into public.quotations (quote_no, customer_id, title, quote_date)
    values (public.next_doc_number('quotation', v_quote_date), v_customer_id, p_header ->> 'title', v_quote_date)
    returning id into v_id;
  end if;

  delete from public.quotation_cost_lines where quotation_id = v_id;
  delete from public.quotation_items where quotation_id = v_id;

  insert into public.quotation_cost_lines (quotation_id, sort_order, category, description, qty, unit, cost_rate, amount)
  select v_id, l.ord::int, l.value ->> 'category', l.value ->> 'description', (l.value ->> 'qty')::numeric,
    nullif(l.value ->> 'unit', ''), (l.value ->> 'cost_rate')::numeric,
    round((l.value ->> 'qty')::numeric * (l.value ->> 'cost_rate')::numeric, 2)
  from jsonb_array_elements(coalesce(p_cost_lines, '[]'::jsonb)) with ordinality as l(value, ord);

  insert into public.quotation_items (quotation_id, sort_order, description, hsn_sac, qty, unit, rate, amount)
  select v_id, i.ord::int, i.value ->> 'description', nullif(i.value ->> 'hsn_sac', ''), (i.value ->> 'qty')::numeric,
    nullif(i.value ->> 'unit', ''), (i.value ->> 'rate')::numeric,
    round((i.value ->> 'qty')::numeric * (i.value ->> 'rate')::numeric, 2)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as i(value, ord);

  select coalesce(sum(amount), 0) into v_cost from public.quotation_cost_lines where quotation_id = v_id;
  select coalesce(sum(amount), 0) into v_subtotal from public.quotation_items where quotation_id = v_id;

  select * into v_settings from public.settings where id = 1;
  if v_settings.gst_enabled then
    v_gst_rate := v_settings.default_gst_rate;
    v_gst := round(v_subtotal * v_gst_rate / 100, 2);
  else
    v_gst_rate := null;
    v_gst := 0;
  end if;
  v_grand := round(v_subtotal + v_gst, 0);

  update public.quotations set
    customer_id = v_customer_id,
    title = p_header ->> 'title',
    site_address = nullif(p_header ->> 'site_address', ''),
    scope = nullif(p_header ->> 'scope', ''),
    terms = nullif(p_header ->> 'terms', ''),
    enquiry_date = (p_header ->> 'enquiry_date')::date,
    quote_date = v_quote_date,
    valid_until = (p_header ->> 'valid_until')::date,
    follow_up_date = (p_header ->> 'follow_up_date')::date,
    margin_percent = coalesce((p_header ->> 'margin_percent')::numeric, 0),
    gst_rate = v_gst_rate,
    cost_total = v_cost,
    subtotal = v_subtotal,
    gst_amount = v_gst,
    round_off = v_grand - (v_subtotal + v_gst),
    grand_total = v_grand
  where id = v_id;

  return v_id;
end;
$$;

-- Draft → Sent → Accepted or Rejected; a draft may also be closed as Rejected (spec 7.1).
create function public.set_quotation_status(p_quotation_id uuid, p_status text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if not public.is_active_user() then
    raise exception 'You need an active login to do this.' using errcode = '42501';
  end if;

  select status into v_status from public.quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'This quotation could not be found.';
  end if;
  if not ((v_status = 'draft' and p_status in ('sent', 'rejected'))
       or (v_status = 'sent' and p_status in ('accepted', 'rejected'))) then
    raise exception 'This quotation is %, so it cannot be marked %.', v_status, p_status;
  end if;
  if p_status = 'sent' and not exists (select 1 from public.quotation_items where quotation_id = p_quotation_id) then
    raise exception 'Add at least one item before sending.';
  end if;

  update public.quotations set
    status = p_status,
    sent_at = case when p_status = 'sent' then now() else sent_at end,
    decided_at = case when p_status in ('accepted', 'rejected') then now() else decided_at end,
    rejection_reason = case when p_status = 'rejected' then nullif(trim(p_reason), '') else rejection_reason end
  where id = p_quotation_id;
end;
$$;

-- Copies a sent or rejected quotation, with its lines, into the next revision as a draft (spec 7.1).
create function public.create_quotation_revision(p_quotation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.quotations;
  v_new uuid;
  v_validity int;
begin
  if not public.is_active_user() then
    raise exception 'You need an active login to do this.' using errcode = '42501';
  end if;

  select * into v_old from public.quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'This quotation could not be found.';
  end if;
  if v_old.status not in ('sent', 'rejected') then
    raise exception 'Only a sent or rejected quotation can be revised.';
  end if;
  select quotation_validity_days into v_validity from public.settings where id = 1;

  -- Superseded first: only one revision of a number may be live.
  update public.quotations set status = 'superseded' where id = v_old.id;

  insert into public.quotations (
    quote_no, revision, customer_id, title, site_address, scope, terms, enquiry_date, quote_date, valid_until,
    margin_percent, gst_rate, cost_total, subtotal, gst_amount, round_off, grand_total
  ) values (
    v_old.quote_no, v_old.revision + 1, v_old.customer_id, v_old.title, v_old.site_address, v_old.scope, v_old.terms,
    v_old.enquiry_date, public.today_ist(), public.today_ist() + v_validity,
    v_old.margin_percent, v_old.gst_rate, v_old.cost_total, v_old.subtotal, v_old.gst_amount, v_old.round_off, v_old.grand_total
  )
  returning id into v_new;

  insert into public.quotation_cost_lines (quotation_id, sort_order, category, description, qty, unit, cost_rate, amount)
  select v_new, sort_order, category, description, qty, unit, cost_rate, amount
  from public.quotation_cost_lines where quotation_id = v_old.id;

  insert into public.quotation_items (quotation_id, sort_order, description, hsn_sac, qty, unit, rate, amount)
  select v_new, sort_order, description, hsn_sac, qty, unit, rate, amount
  from public.quotation_items where quotation_id = v_old.id;

  return v_new;
end;
$$;

-- Makes an accepted quotation into a project, once: its price is the contract value and its cost sheet the estimates.
create function public.convert_quotation(p_quotation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q public.quotations;
  v_project uuid;
  v_project_no text;
begin
  if not public.is_active_user() then
    raise exception 'You need an active login to do this.' using errcode = '42501';
  end if;

  select * into v_q from public.quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'This quotation could not be found.';
  end if;
  if v_q.project_id is not null then
    select project_no into v_project_no from public.projects where id = v_q.project_id;
    raise exception 'This quotation is already project %.', v_project_no;
  end if;
  if v_q.status <> 'accepted' then
    raise exception 'Only an accepted quotation can be made into a project.';
  end if;

  insert into public.projects (
    customer_id, title, site_address, description, contract_value,
    est_material, est_labour, est_painting, est_transport, est_other, quotation_id
  )
  select
    v_q.customer_id, v_q.title, v_q.site_address, v_q.scope, v_q.subtotal,
    coalesce(sum(amount) filter (where category = 'material'), 0),
    coalesce(sum(amount) filter (where category = 'labour'), 0),
    coalesce(sum(amount) filter (where category = 'painting'), 0),
    coalesce(sum(amount) filter (where category = 'transport'), 0),
    coalesce(sum(amount) filter (where category = 'other'), 0),
    v_q.id
  from public.quotation_cost_lines
  where quotation_id = v_q.id
  returning id into v_project;

  update public.quotations set project_id = v_project where id = v_q.id;
  return v_project;
end;
$$;

alter table public.quotations enable row level security;
alter table public.quotation_cost_lines enable row level security;
alter table public.quotation_items enable row level security;

create policy quotations_select on public.quotations for select to authenticated using (public.is_active_user());
create policy quotations_update on public.quotations for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());
create policy quotation_cost_lines_select on public.quotation_cost_lines for select to authenticated using (public.is_active_user());
create policy quotation_items_select on public.quotation_items for select to authenticated using (public.is_active_user());

revoke all on public.quotations, public.quotation_cost_lines, public.quotation_items,
  public.quotation_list_v, public.project_list_v from anon;
revoke insert, update, delete on public.quotations, public.quotation_cost_lines, public.quotation_items from authenticated;
grant update (follow_up_date) on public.quotations to authenticated;
grant select on public.quotation_list_v, public.project_list_v to authenticated;

revoke execute on function public.quotation_lines_locked() from public, anon;
revoke execute on function public.save_quotation_draft(uuid, jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.set_quotation_status(uuid, text, text) from public, anon;
revoke execute on function public.create_quotation_revision(uuid) from public, anon;
revoke execute on function public.convert_quotation(uuid) from public, anon;
grant execute on function public.save_quotation_draft(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.set_quotation_status(uuid, text, text) to authenticated;
grant execute on function public.create_quotation_revision(uuid) to authenticated;
grant execute on function public.convert_quotation(uuid) to authenticated;
