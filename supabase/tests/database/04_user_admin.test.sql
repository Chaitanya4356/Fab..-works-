begin;
create extension if not exists pgtap with schema extensions;
select plan(5);
select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ select public.set_profile_active('22222222-2222-2222-2222-222222222222', false) $$, 'an active user can switch another login off');
select results_eq($$ select is_active from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$, $$ values (false) $$, 'the login is now off');
select throws_ok($$ select public.set_profile_active('11111111-1111-1111-1111-111111111111', false) $$, 'P0001', 'You can''t switch off your own login.', 'cannot switch off yourself');
select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.set_profile_active('11111111-1111-1111-1111-111111111111', false) $$, '42501', 'You need an active login to do this.', 'a switched-off user cannot switch others off');
select tests.clear_authentication();
select results_eq($$ select changed_by from public.audit_log where table_name = 'profiles' and action = 'UPDATE' and record_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$, 'the audit log shows who switched the login off');

select * from finish();
rollback;
