begin;
create extension if not exists pgtap with schema extensions;
select plan(16);
select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');
update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ insert into public.customers (id, name, phone, city, state)
  values ('a0000000-0000-0000-0000-000000000001', 'Sharma Steel Traders', '9876543210', 'Hyderabad', 'Telangana') $$,
  'an active user can add a customer');
select throws_ok($$ insert into public.customers (name) values ('   ') $$, '23514', null, 'a customer needs a name');
select throws_ok($$ delete from public.customers $$, '42501', null, 'customers are never deleted');

select lives_ok($$ insert into public.projects (id, customer_id, title, due_date)
  values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Warehouse shed 40x80', public.today_ist() - 1) $$,
  'an active user can add a project');
select is((select project_no from public.projects where id = 'b0000000-0000-0000-0000-000000000001'),
  'PRJ/' || public.financial_year(public.today_ist()) || '/0001', 'a new project gets the next project number');
select lives_ok($$ insert into public.projects (id, customer_id, title, project_no)
  values ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Staircase', 'MY-OWN-NUMBER') $$,
  'a project sent with its own number still saves');
select is((select project_no from public.projects where id = 'b0000000-0000-0000-0000-000000000002'),
  'PRJ/' || public.financial_year(public.today_ist()) || '/0002', 'the number is always assigned by SteelFlow');
select throws_ok($$ update public.projects set project_no = 'X' $$, '42501', null, 'a project number cannot be changed');
select throws_ok($$ insert into public.projects (customer_id, title, start_date, due_date)
  values ('a0000000-0000-0000-0000-000000000001', 'Gate', '2026-11-10', '2026-11-01') $$, '23514', null, 'the due date cannot be before the start date');
select throws_ok($$ insert into public.projects (customer_id, title, contract_value)
  values ('a0000000-0000-0000-0000-000000000001', 'Gate', -1) $$, '23514', null, 'amounts cannot be negative');
select throws_ok($$ insert into public.projects (customer_id, title)
  values ('a0000000-0000-0000-0000-00000000dead', 'Gate') $$, '23503', null, 'a project needs a real customer');
select results_eq($$ select is_overdue from public.project_list_v where id = 'b0000000-0000-0000-0000-000000000001' $$,
  $$ values (true) $$, 'a project past its due date is overdue');
update public.projects set status = 'completed' where id = 'b0000000-0000-0000-0000-000000000001';
select results_eq($$ select is_overdue from public.project_list_v where id = 'b0000000-0000-0000-0000-000000000001' $$,
  $$ values (false) $$, 'a completed project is not overdue');
update public.customers set is_active = false where id = 'a0000000-0000-0000-0000-000000000001';
select results_eq($$ select customer_name, customer_is_active from public.project_list_v where id = 'b0000000-0000-0000-0000-000000000002' $$,
  $$ values ('Sharma Steel Traders'::text, false) $$, 'a switched-off customer''s projects still show their name');

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select is_empty($$ select id from public.project_list_v $$, 'switched-off users see no projects');
select tests.clear_authentication();
select results_eq($$ select table_name, action from public.audit_log where table_name in ('customers', 'projects') and action = 'INSERT' order by id $$,
  $$ values ('customers'::text, 'INSERT'::text), ('projects', 'INSERT'), ('projects', 'INSERT') $$, 'customers and projects are audited');

select * from finish();
rollback;
