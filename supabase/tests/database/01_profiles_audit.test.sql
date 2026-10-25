begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao', '9876543210');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');

select results_eq(
  $$ select full_name, phone, login_email, is_active from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('Asha Rao'::text, '9876543210'::text, 'asha@steelflow.test'::text, true) $$,
  'a new login gets a profile from its details');

-- A login SteelFlow did not create (e.g. a public sign-up if the hosted toggle is left on) must not get in.
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'stranger@example.com', '{"provider": "email", "providers": ["email"]}', '{"full_name": "Stranger"}', now(), now());
select results_eq(
  $$ select is_active from public.profiles where id = '33333333-3333-3333-3333-333333333333' $$,
  $$ values (false) $$,
  'a login SteelFlow did not create starts switched off');

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select ok(public.is_active_user(), 'an active user is active');
select results_eq(
  $$ update public.profiles set full_name = 'Ravi K' where id = '22222222-2222-2222-2222-222222222222' returning updated_by $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'changes record who made them');
select throws_ok($$ update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'users cannot switch logins off directly');
select throws_ok($$ insert into public.audit_log (table_name, record_id, action) values ('x', '1', 'INSERT') $$,
  '42501', null, 'nobody can write the audit log directly');
select throws_ok($$ delete from public.audit_log $$, '42501', null, 'nobody can delete audit history');
select tests.clear_authentication();

select results_eq(
  $$ select changed_by, old_values->>'full_name', new_values->>'full_name' from public.audit_log
     where table_name = 'profiles' and record_id = '22222222-2222-2222-2222-222222222222' and action = 'UPDATE' $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid, 'Ravi Kumar'::text, 'Ravi K'::text) $$,
  'profile changes are in the audit log');

update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';
select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select ok(not public.is_active_user(), 'a switched-off user is not active');
select is_empty($$ select id from public.profiles $$, 'a switched-off user sees nothing');
select tests.clear_authentication();
select ok(not public.is_active_user(), 'nobody logged in is not active');

select * from finish();
rollback;
