-- Stage 0: app users, row metadata and audit history (spec 4.4, 4.7, 6.1, 6.2).

-- App users, one per Supabase login.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  login_email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

-- True when the caller is logged in with a profile that is switched on.
create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_active
  );
$$;

-- Fills created_* / updated_* on every business table.
create function public.set_row_meta()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), case when tg_op = 'INSERT' then new.created_by end);
  return new;
end;
$$;

-- Who changed which record, when, with before and after values.
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  old_values jsonb,
  new_values jsonb
);

create index audit_log_record_idx on public.audit_log (table_name, record_id);

create function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and v_old = v_new then
    return null;
  end if;
  insert into public.audit_log (table_name, record_id, action, changed_by, changed_at, old_values, new_values)
  values (tg_table_name, coalesce(v_new ->> 'id', v_old ->> 'id'), tg_op, auth.uid(), now(), v_old, v_new);
  return null;
end;
$$;

-- A new login gets its profile from the details it was created with.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, login_email, created_by)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    (new.raw_user_meta_data ->> 'created_by')::uuid
  );
  return new;
end;
$$;

create trigger profiles_row_meta before insert or update on public.profiles
  for each row execute function public.set_row_meta();
create trigger profiles_audit after insert or update or delete on public.profiles
  for each row execute function public.audit_row();
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (public.is_active_user());
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_active_user());

revoke all on public.profiles, public.audit_log from anon;
revoke insert, update, delete on public.profiles, public.audit_log from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

revoke execute on function public.is_active_user(), public.set_row_meta(), public.audit_row(), public.handle_new_user() from public, anon;
grant execute on function public.is_active_user() to authenticated;
