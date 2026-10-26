-- Stage 2: workers and project teams (spec 6.2, 6.5, 7.6).

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  phone text,
  alt_phone text,
  address text,
  trade text check (trade in ('fitter', 'welder', 'fabricator', 'painter', 'helper', 'supervisor', 'other')),
  joining_date date,
  skills text,
  experience_years numeric(4,1) check (experience_years >= 0),
  pay_type text check (pay_type in ('daily', 'hourly', 'monthly')),
  pay_rate numeric(12,2) check (pay_rate >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  -- A wage is a rate and how it is paid; one without the other cannot pre-fill labour entries (spec 7.6).
  constraint workers_pay_together check ((pay_type is null) = (pay_rate is null))
);

create index workers_name_idx on public.workers (lower(full_name));

-- A place on a project's team. Taking someone off sets to_date; rows are never deleted (spec 6.5).
create table public.project_workers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  worker_id uuid not null references public.workers (id),
  role text,
  from_date date,
  to_date date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  constraint project_workers_last_after_first check (from_date is null or to_date is null or to_date >= from_date)
);

create unique index project_workers_one_open_idx on public.project_workers (project_id, worker_id) where to_date is null;
create index project_workers_worker_idx on public.project_workers (worker_id);
create index project_workers_project_idx on public.project_workers (project_id);

create trigger workers_row_meta before insert or update on public.workers
  for each row execute function public.set_row_meta();
create trigger workers_audit after insert or update or delete on public.workers
  for each row execute function public.audit_row();
create trigger project_workers_row_meta before insert or update on public.project_workers
  for each row execute function public.set_row_meta();

-- Team places with the worker's and the project's names, for the project's Team tab and the worker's profile.
create view public.project_team_v
with (security_invoker = true)
as
select
  pw.id,
  pw.project_id,
  pw.worker_id,
  pw.role,
  pw.from_date,
  pw.to_date,
  pw.notes,
  (pw.to_date is null) as is_current,
  w.full_name as worker_name,
  w.trade,
  w.phone as worker_phone,
  w.status as worker_status,
  p.project_no,
  p.title as project_title,
  p.status as project_status
from public.project_workers pw
join public.workers w on w.id = pw.worker_id
join public.projects p on p.id = pw.project_id;

alter table public.workers enable row level security;
alter table public.project_workers enable row level security;

create policy workers_select on public.workers for select to authenticated using (public.is_active_user());
create policy workers_insert on public.workers for insert to authenticated with check (public.is_active_user());
create policy workers_update on public.workers for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());
create policy project_workers_select on public.project_workers for select to authenticated using (public.is_active_user());
create policy project_workers_insert on public.project_workers for insert to authenticated with check (public.is_active_user());
create policy project_workers_update on public.project_workers for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

revoke all on public.workers, public.project_workers, public.project_team_v from anon;
revoke delete, update on public.workers, public.project_workers from authenticated;
grant update (
  full_name, phone, alt_phone, address, trade, joining_date, skills, experience_years, pay_type, pay_rate, status,
  emergency_contact_name, emergency_contact_phone, notes
) on public.workers to authenticated;
grant update (role, from_date, to_date, notes) on public.project_workers to authenticated;
grant select on public.project_team_v to authenticated;
