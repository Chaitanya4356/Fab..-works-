-- Two real connections (dblink): one takes a number while the other saves a new next number.
-- The connections commit for real, so this file cleans up after itself.
begin;
create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
select plan(3);

select extensions.dblink_connect('setup', (select format('host=%s port=%s dbname=postgres user=postgres password=postgres', host(inet_server_addr()), inet_server_port())));
select extensions.dblink_connect('a', (select format('host=%s port=%s dbname=postgres user=postgres password=postgres', host(inet_server_addr()), inet_server_port())));
select extensions.dblink_connect('b', (select format('host=%s port=%s dbname=postgres user=postgres password=postgres', host(inet_server_addr()), inet_server_port())));

select extensions.dblink_exec('setup', $$ do $x$ begin perform tests.create_user('55555555-5555-5555-5555-555555555555', 'race@steelflow.test', 'Race Tester'); end $x$ $$);
select extensions.dblink_exec('setup', $$ insert into public.doc_counters (doc_type, series, last_number, highest_issued) values ('invoice', '2030-31', 10, 10) $$);

-- A takes invoice number 11 and keeps its transaction open.
select extensions.dblink_exec('a', 'begin');
select extensions.dblink_exec('a', $$ do $x$ begin perform tests.authenticate_as('55555555-5555-5555-5555-555555555555'); end $x$ $$);
select is(
  (select n from extensions.dblink('a', $$ select public.next_doc_number('invoice', '2030-10-01') $$) as t(n text)),
  'INV/2030-31/0011', 'A takes invoice 11 but has not committed yet');

-- B asks for next number 11 at the same moment, and waits on A.
select extensions.dblink_send_query('b', $$
  do $x$ begin
    perform tests.authenticate_as('55555555-5555-5555-5555-555555555555');
    perform public.save_doc_number_formats('[{"doc_type": "invoice", "prefix": "INV", "separator": "/", "year_style": "full", "digits": 4, "next_number": 11}]', '2030-10-01');
  end $x$
$$);
do $$
begin
  for i in 1..100 loop
    exit when exists (
      select 1 from pg_stat_activity
      where pid <> pg_backend_pid() and wait_event_type = 'Lock' and query like '%save_doc_number_formats%'
    );
    perform pg_sleep(0.05);
  end loop;
end
$$;

select extensions.dblink_exec('a', 'commit');

select throws_ok(
  $$ select * from extensions.dblink_get_result('b') as t(r text) $$,
  'P0001', 'Invoice numbers up to 11 have already been used. The next number must be 12 or higher.',
  'a save that waited on a number being taken refuses to hand that number out again');

select extensions.dblink_exec('setup', 'begin');
select extensions.dblink_exec('setup', $$ do $x$ begin perform tests.authenticate_as('55555555-5555-5555-5555-555555555555'); end $x$ $$);
select is(
  (select n from extensions.dblink('setup', $$ select public.next_doc_number('invoice', '2030-10-02') $$) as t(n text)),
  'INV/2030-31/0012', 'so the next invoice is 12, not a second 11');
select extensions.dblink_exec('setup', 'commit');

-- Clean up what the connections committed.
select extensions.dblink_exec('setup', $$ delete from public.doc_counters where series = '2030-31' $$);
select extensions.dblink_exec('setup', $$ update public.doc_number_formats set updated_by = null where updated_by = '55555555-5555-5555-5555-555555555555' $$);
select extensions.dblink_exec('setup', $$ delete from auth.users where id = '55555555-5555-5555-5555-555555555555' $$);
select extensions.dblink_disconnect('setup');
select extensions.dblink_disconnect('a');
select extensions.dblink_disconnect('b');

select * from finish();
rollback;
