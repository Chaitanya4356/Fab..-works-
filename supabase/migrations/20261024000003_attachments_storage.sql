-- Stage 0: attachments and private file storage (spec 4.5, 6.2).

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in (
    'customer', 'supplier', 'worker', 'project', 'quotation',
    'activity_update', 'purchase_bill', 'dispatch', 'expense'
  )),
  entity_id uuid not null,
  file_path text not null,
  file_name text,
  mime_type text,
  size_bytes int,
  caption text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create index attachments_entity_idx on public.attachments (entity_type, entity_id);

create trigger attachments_row_meta before insert or update on public.attachments
  for each row execute function public.set_row_meta();
create trigger attachments_audit after insert or update or delete on public.attachments
  for each row execute function public.audit_row();

alter table public.attachments enable row level security;

create policy attachments_select on public.attachments for select to authenticated using (public.is_active_user());
create policy attachments_insert on public.attachments for insert to authenticated with check (public.is_active_user());
create policy attachments_update on public.attachments for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());
create policy attachments_delete on public.attachments for delete to authenticated using (public.is_active_user());

revoke all on public.attachments from anon;
revoke update on public.attachments from authenticated;
grant update (caption) on public.attachments to authenticated;

-- One private bucket for every uploaded file, 10 MB per file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 10485760)
on conflict (id) do nothing;

create policy "files: active users read" on storage.objects for select to authenticated
  using (bucket_id = 'files' and public.is_active_user());
create policy "files: active users upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and public.is_active_user());
create policy "files: active users replace" on storage.objects for update to authenticated
  using (bucket_id = 'files' and public.is_active_user()) with check (bucket_id = 'files' and public.is_active_user());
create policy "files: active users remove" on storage.objects for delete to authenticated
  using (bucket_id = 'files' and public.is_active_user());

-- Space used against the free-plan limits.
create function public.storage_usage()
returns table (files_bytes bigint, database_bytes bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_active_user() then
    raise exception 'You need an active login to do this.' using errcode = '42501';
  end if;
  return query
    select
      coalesce((select sum((o.metadata ->> 'size')::bigint) from storage.objects o where o.bucket_id = 'files'), 0)::bigint,
      pg_database_size(current_database())::bigint;
end;
$$;

revoke execute on function public.storage_usage() from public, anon;
grant execute on function public.storage_usage() to authenticated;
