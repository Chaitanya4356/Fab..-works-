-- Stage 0 review fixes.

-- 1. A login is only switched on when SteelFlow created it: the app sets app_metadata.steelflow_staff with the secret
--    key, which nobody can do from a browser. A public sign-up (if the hosted "Allow new users to sign up" toggle is
--    ever left on) or an anonymous sign-in gets a switched-off profile and sees nothing.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, login_email, is_active, created_by)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    coalesce((new.raw_app_meta_data ->> 'steelflow_staff')::boolean, false),
    (new.raw_user_meta_data ->> 'created_by')::uuid
  );
  return new;
end;
$$;

-- 2. Saving a next number cannot race with taking a number. The counter row is created if missing and locked before
--    highest_issued is checked, so a number taken by another user in the meantime is always seen and never repeated.
create or replace function public.save_doc_number_formats(p_formats jsonb, p_as_of date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_type text;
  v_prefix text;
  v_style text;
  v_series text;
  v_next int;
  v_highest int;
  v_label text;
begin
  if not public.is_active_user() then
    raise exception 'You need an active login to do this.' using errcode = '42501';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_formats, '[]'::jsonb)) loop
    v_type := v_item ->> 'doc_type';
    v_prefix := upper(trim(v_item ->> 'prefix'));

    if not exists (select 1 from public.doc_number_formats where doc_type = v_type) then
      raise exception 'Unknown document type: %', v_type;
    end if;
    if exists (select 1 from public.doc_number_formats where doc_type <> v_type and upper(prefix) = v_prefix) then
      raise exception 'Each document type needs its own prefix.';
    end if;

    update public.doc_number_formats
       set prefix = v_prefix,
           separator = coalesce(v_item ->> 'separator', separator),
           year_style = coalesce(v_item ->> 'year_style', year_style),
           digits = coalesce((v_item ->> 'digits')::smallint, digits)
     where doc_type = v_type
     returning year_style into v_style;

    if v_item ->> 'next_number' is not null then
      v_next := (v_item ->> 'next_number')::int;
      if v_next < 1 then
        raise exception 'The next number must be 1 or more.';
      end if;
      v_series := case when v_style = 'none' then 'all' else public.financial_year(p_as_of) end;

      insert into public.doc_counters (doc_type, series, last_number, highest_issued)
      values (v_type, v_series, 0, 0)
      on conflict (doc_type, series) do nothing;

      select highest_issued into v_highest
        from public.doc_counters
       where doc_type = v_type and series = v_series
         for update;

      if v_highest >= v_next then
        v_label := case v_type
          when 'project' then 'Project' when 'quotation' then 'Quotation' when 'invoice' then 'Invoice'
          when 'dispatch' then 'Delivery note' when 'po' then 'Purchase order' end;
        raise exception '% numbers up to % have already been used. The next number must be % or higher.',
          v_label, v_highest, v_highest + 1;
      end if;

      update public.doc_counters
         set last_number = v_next - 1
       where doc_type = v_type and series = v_series;
    end if;
  end loop;
end;
$$;

-- 3. Supabase Auth's admin createUser writes app_metadata in a second step, after inserting the login, so the flag
--    is also honoured when it first appears in an update. Only the secret key can change app_metadata.
create function public.handle_user_flagged()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((new.raw_app_meta_data ->> 'steelflow_staff')::boolean, false)
     and not coalesce((old.raw_app_meta_data ->> 'steelflow_staff')::boolean, false) then
    update public.profiles set is_active = true where id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_user_flagged() from public, anon;

create trigger on_auth_user_flagged after update of raw_app_meta_data on auth.users
  for each row execute function public.handle_user_flagged();
