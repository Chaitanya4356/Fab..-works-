-- Stage 0: workshop settings and document numbering (spec 4.9, 6.2, 6.4, 7.11).

-- One row of workshop details and defaults.
create table public.settings (
  id smallint primary key default 1 constraint settings_single_row check (id = 1),
  workshop_name text not null default '',
  address text,
  city text,
  state text,
  state_code text,
  pincode text,
  phone text,
  email text,
  logo_path text,
  bank_name text,
  bank_account_name text,
  bank_account_no text,
  bank_ifsc text,
  upi_id text,
  gst_enabled boolean not null default false,
  gstin text,
  gst_registered_from date,
  default_gst_rate numeric(5,2) not null default 18,
  default_margin_percent numeric(5,2) not null default 15,
  quotation_validity_days int not null default 15,
  invoice_due_days int not null default 15,
  quotation_terms text,
  invoice_terms text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

-- How each document type is numbered.
create table public.doc_number_formats (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null unique check (doc_type in ('project', 'quotation', 'invoice', 'dispatch', 'po')),
  prefix text not null check (prefix ~ '^[A-Z0-9][A-Z0-9/-]{0,9}$'),
  separator text not null default '/' check (separator in ('/', '-', '')),
  year_style text not null default 'full' check (year_style in ('full', 'short', 'none')),
  digits smallint not null default 4 check (digits between 1 and 8),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create unique index doc_number_formats_prefix_key on public.doc_number_formats (upper(prefix));

-- The running numbers behind each format. series is the financial year, or 'all' when the format shows no year.
create table public.doc_counters (
  doc_type text not null check (doc_type in ('project', 'quotation', 'invoice', 'dispatch', 'po')),
  series text not null,
  last_number int not null default 0 check (last_number >= 0),
  highest_issued int not null default 0 check (highest_issued >= 0),
  primary key (doc_type, series)
);

create trigger settings_row_meta before insert or update on public.settings
  for each row execute function public.set_row_meta();
create trigger settings_audit after insert or update or delete on public.settings
  for each row execute function public.audit_row();
create trigger doc_number_formats_row_meta before insert or update on public.doc_number_formats
  for each row execute function public.set_row_meta();
create trigger doc_number_formats_audit after insert or update or delete on public.doc_number_formats
  for each row execute function public.audit_row();

insert into public.settings default values;
insert into public.doc_number_formats (doc_type, prefix) values
  ('project', 'PRJ'), ('quotation', 'QT'), ('invoice', 'INV'), ('dispatch', 'DN'), ('po', 'PO');

-- "2026-27" for any date from 1 April 2026 to 31 March 2027.
create function public.financial_year(p_date date)
returns text
language sql
immutable
set search_path = ''
as $$
  select y::text || '-' || lpad(((y + 1) % 100)::text, 2, '0')
  from (
    select case when extract(month from p_date) >= 4
                then extract(year from p_date)::int
                else extract(year from p_date)::int - 1 end as y
  ) as s;
$$;

create function public.today_ist()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

create function public.next_doc_number(p_doc_type text, p_doc_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.doc_number_formats;
  v_fy text;
  v_series text;
  v_n int;
begin
  if not public.is_active_user() then
    raise exception 'You need an active login to do this.' using errcode = '42501';
  end if;
  if p_doc_date is null then
    raise exception 'A document date is needed to give it a number.';
  end if;

  select * into f from public.doc_number_formats where doc_type = p_doc_type;
  if not found then
    raise exception 'Unknown document type: %', p_doc_type;
  end if;

  v_fy := public.financial_year(p_doc_date);
  v_series := case when f.year_style = 'none' then 'all' else v_fy end;

  insert into public.doc_counters as c (doc_type, series, last_number, highest_issued)
  values (p_doc_type, v_series, 1, 1)
  on conflict (doc_type, series) do update
    set last_number = c.last_number + 1,
        highest_issued = greatest(c.highest_issued, c.last_number + 1)
  returning last_number into v_n;

  return concat_ws(
    f.separator,
    f.prefix,
    case f.year_style when 'full' then v_fy when 'short' then substr(v_fy, 3) end,
    lpad(v_n::text, greatest(f.digits, length(v_n::text)), '0')
  );
end;
$$;

-- Saves formats and any new next numbers in one step. p_formats is an array of
-- { doc_type, prefix, separator, year_style, digits, next_number? }.
create function public.save_doc_number_formats(p_formats jsonb, p_as_of date)
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
      select highest_issued into v_highest from public.doc_counters where doc_type = v_type and series = v_series;
      if coalesce(v_highest, 0) >= v_next then
        v_label := case v_type
          when 'project' then 'Project' when 'quotation' then 'Quotation' when 'invoice' then 'Invoice'
          when 'dispatch' then 'Delivery note' when 'po' then 'Purchase order' end;
        raise exception '% numbers up to % have already been used. The next number must be % or higher.',
          v_label, v_highest, v_highest + 1;
      end if;
      insert into public.doc_counters as c (doc_type, series, last_number, highest_issued)
      values (v_type, v_series, v_next - 1, 0)
      on conflict (doc_type, series) do update set last_number = excluded.last_number;
    end if;
  end loop;
end;
$$;

alter table public.settings enable row level security;
alter table public.doc_number_formats enable row level security;
alter table public.doc_counters enable row level security;

create policy settings_select on public.settings for select to authenticated using (public.is_active_user());
create policy settings_update on public.settings for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());
create policy doc_number_formats_select on public.doc_number_formats for select to authenticated using (public.is_active_user());
create policy doc_counters_select on public.doc_counters for select to authenticated using (public.is_active_user());

revoke all on public.settings, public.doc_number_formats, public.doc_counters from anon;
revoke insert, update, delete on public.settings, public.doc_number_formats, public.doc_counters from authenticated;
grant update (
  workshop_name, address, city, state, state_code, pincode, phone, email, logo_path,
  bank_name, bank_account_name, bank_account_no, bank_ifsc, upi_id,
  gst_enabled, gstin, gst_registered_from, default_gst_rate, default_margin_percent,
  quotation_validity_days, invoice_due_days, quotation_terms, invoice_terms
) on public.settings to authenticated;

revoke execute on function public.financial_year(date), public.today_ist(),
  public.next_doc_number(text, date), public.save_doc_number_formats(jsonb, date) from public, anon;
grant execute on function public.financial_year(date), public.today_ist(),
  public.next_doc_number(text, date), public.save_doc_number_formats(jsonb, date) to authenticated;
