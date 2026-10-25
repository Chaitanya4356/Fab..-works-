-- Local development and test helpers only. seed.sql is never pushed to hosted projects.

create schema if not exists tests;

-- Creates a login directly in auth.users (plus its email identity), the way Supabase Auth would.
create or replace function tests.create_user(p_id uuid, p_email text, p_full_name text, p_phone text default null)
returns uuid
language plpgsql
as $$
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"], "steelflow_staff": true}',
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, 'email',
          jsonb_build_object('sub', p_id::text, 'email', p_email), now(), now(), now());

  return p_id;
end;
$$;

-- Acts as a logged-in user for the rest of the current transaction.
create or replace function tests.authenticate_as(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;

-- Goes back to the database owner with nobody logged in.
create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;
revoke usage on schema tests from anon;
