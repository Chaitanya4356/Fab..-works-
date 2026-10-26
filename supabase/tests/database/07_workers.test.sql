-- supabase/tests/database/07_workers.test.sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);
select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');
update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
insert into public.customers (id, name) values ('a0000000-0000-0000-0000-000000000001', 'Sharma Steel Traders');
insert into public.projects (id, customer_id, title) values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Warehouse shed');

select lives_ok($$ insert into public.workers (id, full_name, phone, trade, pay_type, pay_rate)
  values ('c0000000-0000-0000-0000-000000000001', 'Ramesh Kumar', '9876500001', 'welder', 'daily', 650) $$,
  'an active user can add a worker');
select is((select status from public.workers where id = 'c0000000-0000-0000-0000-000000000001'), 'active', 'a new worker is active');
select throws_ok($$ insert into public.workers (full_name) values ('  ') $$, '23514', null, 'a worker needs a name');
select throws_ok($$ insert into public.workers (full_name, trade) values ('Imran', 'plumber') $$, '23514', null, 'the trade comes from the list');
select throws_ok($$ insert into public.workers (full_name, pay_type, pay_rate) values ('Imran', 'daily', -1) $$, '23514', null, 'a pay rate cannot be negative');
select throws_ok($$ insert into public.workers (full_name, pay_rate) values ('Imran', 650) $$, '23514', null, 'a pay rate needs a pay type');
select throws_ok($$ delete from public.workers $$, '42501', null, 'workers are never deleted');

select lives_ok($$ insert into public.project_workers (id, project_id, worker_id, role, from_date)
  values ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
  'Lead welder', public.today_ist() - 10) $$, 'a worker joins a project team');
select throws_ok($$ insert into public.project_workers (project_id, worker_id)
  values ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001') $$,
  '23505', null, 'a worker is on a project team only once at a time');
select throws_ok($$ update public.project_workers set to_date = public.today_ist() - 11 where id = 'd0000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'the last day cannot be before the first');
update public.project_workers set to_date = public.today_ist() - 1 where id = 'd0000000-0000-0000-0000-000000000001';
select lives_ok($$ insert into public.project_workers (id, project_id, worker_id, from_date)
  values ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', public.today_ist()) $$,
  'a worker taken off the team can rejoin later');
select results_eq($$ select is_current from public.project_team_v where worker_id = 'c0000000-0000-0000-0000-000000000001' order by from_date $$,
  $$ values (false), (true) $$, 'the team view tells current places from past ones');
select results_eq($$ select worker_name, trade, project_no, project_title from public.project_team_v where id = 'd0000000-0000-0000-0000-000000000002' $$,
  $$ values ('Ramesh Kumar'::text, 'welder'::text, 'PRJ/' || public.financial_year(public.today_ist()) || '/0001', 'Warehouse shed'::text) $$,
  'the team view shows the worker and the project');
select throws_ok($$ delete from public.project_workers $$, '42501', null, 'team history is never deleted');
select throws_ok($$ update public.project_workers set worker_id = worker_id $$, '42501', null, 'a team place cannot move to another worker');

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select is_empty($$ select id from public.workers $$, 'switched-off users see no workers');
select is_empty($$ select id from public.project_team_v $$, 'switched-off users see no teams');
select tests.clear_authentication();
select results_eq($$ select table_name, action from public.audit_log where table_name = 'workers' order by id $$,
  $$ values ('workers'::text, 'INSERT'::text) $$, 'workers are audited');

select * from finish();
rollback;
