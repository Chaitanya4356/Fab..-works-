begin;
create extension if not exists pgtap with schema extensions;
select plan(9);
select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');
update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';

select results_eq($$ select public, file_size_limit from storage.buckets where id = 'files' $$,
  $$ values (false, 10485760::bigint) $$, 'the files bucket is private with a 10 MB limit');

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ insert into public.attachments (entity_type, entity_id, file_path, file_name, mime_type, size_bytes)
  values ('project', '33333333-3333-3333-3333-333333333333', 'project/33333333-3333-3333-3333-333333333333/a1-shed-ga.pdf', 'Shed GA.pdf', 'application/pdf', 2048) $$,
  'an active user can record an attachment');
select throws_ok($$ insert into public.attachments (entity_type, entity_id, file_path) values ('invoice_x', '33333333-3333-3333-3333-333333333333', 'x/y') $$,
  '23514', null, 'unknown attachment types are refused');
select lives_ok($$ insert into storage.objects (bucket_id, name, metadata)
  values ('files', 'project/33333333-3333-3333-3333-333333333333/a1-shed-ga.pdf', '{"size": 2048}') $$,
  'an active user can store a file');
select results_eq($$ select files_bytes from public.storage_usage() $$, $$ values (2048::bigint) $$, 'storage usage adds up file sizes');
select results_eq($$ delete from public.attachments where file_name = 'Shed GA.pdf' returning file_name $$,
  $$ values ('Shed GA.pdf'::text) $$, 'an active user can remove a wrong attachment');

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select is_empty($$ select name from storage.objects where bucket_id = 'files' $$, 'switched-off users cannot see files');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('files', 'project/x/b.jpg') $$,
  '42501', null, 'switched-off users cannot upload');
select tests.clear_authentication();

select results_eq($$ select action from public.audit_log where table_name = 'attachments' order by id $$,
  $$ values ('INSERT'::text), ('DELETE'::text) $$, 'adding and removing attachments is audited');

select * from finish();
rollback;
