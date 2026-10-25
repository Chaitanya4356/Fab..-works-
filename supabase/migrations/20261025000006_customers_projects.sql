-- Stage 1: customers and projects (spec 6.2, 6.5, 7.2).

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  contact_person text,
  phone text,
  alt_phone text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  gstin text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index customers_name_idx on public.customers (lower(name));

-- quotation_id is added in stage 3, together with its foreign key, once quotations exist.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  project_no text not null unique,
  customer_id uuid not null references public.customers (id),
  title text not null check (length(trim(title)) > 0),
  site_address text,
  description text,
  notes text,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  start_date date,
  due_date date,
  completed_date date,
  contract_value numeric(14,2) check (contract_value >= 0),
  est_material numeric(14,2) not null default 0 check (est_material >= 0),
  est_labour numeric(14,2) not null default 0 check (est_labour >= 0),
  est_painting numeric(14,2) not null default 0 check (est_painting >= 0),
  est_transport numeric(14,2) not null default 0 check (est_transport >= 0),
  est_other numeric(14,2) not null default 0 check (est_other >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  constraint projects_due_after_start check (start_date is null or due_date is null or due_date >= start_date)
);

create index projects_customer_idx on public.projects (customer_id);
create index projects_status_due_idx on public.projects (status, due_date);

-- Every project gets the next project number; any number sent in is ignored.
create function public.projects_assign_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.project_no := public.next_doc_number('project', public.today_ist());
  return new;
end;
$$;

create trigger projects_assign_number before insert on public.projects
  for each row execute function public.projects_assign_number();

create trigger customers_row_meta before insert or update on public.customers
  for each row execute function public.set_row_meta();
create trigger customers_audit after insert or update or delete on public.customers
  for each row execute function public.audit_row();
create trigger projects_row_meta before insert or update on public.projects
  for each row execute function public.set_row_meta();
create trigger projects_audit after insert or update or delete on public.projects
  for each row execute function public.audit_row();

-- The project list, with the customer's name and an overdue flag. security_invoker keeps the callers' RLS.
create view public.project_list_v
with (security_invoker = true)
as
select
  p.*,
  c.name as customer_name,
  c.is_active as customer_is_active,
  (p.due_date < public.today_ist() and p.status not in ('completed', 'cancelled')) as is_overdue
from public.projects p
join public.customers c on c.id = p.customer_id;

alter table public.customers enable row level security;
alter table public.projects enable row level security;

create policy customers_select on public.customers for select to authenticated using (public.is_active_user());
create policy customers_insert on public.customers for insert to authenticated with check (public.is_active_user());
create policy customers_update on public.customers for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());
create policy projects_select on public.projects for select to authenticated using (public.is_active_user());
create policy projects_insert on public.projects for insert to authenticated with check (public.is_active_user());
create policy projects_update on public.projects for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

revoke all on public.customers, public.projects, public.project_list_v from anon;
revoke delete, update on public.customers, public.projects from authenticated;
grant update (
  name, contact_person, phone, alt_phone, email, address, city, state, pincode, gstin, notes, is_active
) on public.customers to authenticated;
grant update (
  customer_id, title, site_address, description, notes, status, start_date, due_date, completed_date,
  contract_value, est_material, est_labour, est_painting, est_transport, est_other
) on public.projects to authenticated;
grant select on public.project_list_v to authenticated;

revoke execute on function public.projects_assign_number() from public, anon;
