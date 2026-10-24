begin;
create extension if not exists pgtap with schema extensions;
select plan(31);
select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');
update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';

select results_eq(
  $$ select gst_enabled, default_gst_rate, default_margin_percent from public.settings $$,
  $$ values (false, 18.00::numeric(5,2), 15.00::numeric(5,2)) $$,
  'one settings row with GST off');
select throws_ok($$ insert into public.settings (id) values (2) $$, '23514', null, 'there is only ever one settings row');
select results_eq(
  $$ select doc_type, prefix, separator, year_style, digits::int from public.doc_number_formats order by doc_type $$,
  $$ values ('dispatch'::text, 'DN'::text, '/'::text, 'full'::text, 4),
            ('invoice', 'INV', '/', 'full', 4), ('po', 'PO', '/', 'full', 4),
            ('project', 'PRJ', '/', 'full', 4), ('quotation', 'QT', '/', 'full', 4) $$,
  'every document type starts with the default format');
select is(public.financial_year('2027-03-31'), '2026-27', '31 March belongs to the year that began the April before');
select is(public.financial_year('2027-04-01'), '2027-28', 'the year restarts on 1 April');

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select is(public.next_doc_number('invoice', '2027-03-31'), 'INV/2026-27/0001', 'E12: first invoice number of 2026-27');
select is(public.next_doc_number('invoice', '2027-03-31'), 'INV/2026-27/0002', 'numbers go up by one');
select is(public.next_doc_number('invoice', '2027-04-01'), 'INV/2027-28/0001', 'E12: numbering restarts on 1 April');
select is(public.next_doc_number('project', '2026-10-24'), 'PRJ/2026-27/0001', 'each document type has its own sequence');
select throws_ok($$ select public.next_doc_number('receipt', '2026-10-24') $$, 'P0001', 'Unknown document type: receipt', 'unknown document types are refused');
select throws_ok($$ insert into public.doc_counters (doc_type, series, last_number) values ('invoice', '2030-31', 5) $$, '42501', null, 'counters cannot be written directly');
select throws_ok($$ update public.doc_number_formats set prefix = 'X' $$, '42501', null, 'formats change only through save_doc_number_formats');
select results_eq($$ update public.settings set workshop_name = 'Sri Balaji Fabricators' returning updated_by $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$, 'an active user can update settings');

select lives_ok($$ select public.save_doc_number_formats('[
    {"doc_type": "invoice", "prefix": "sbf", "separator": "/", "year_style": "full", "digits": 3, "next_number": 246},
    {"doc_type": "quotation", "prefix": "SBF-Q", "separator": "-", "year_style": "short", "digits": 4},
    {"doc_type": "po", "prefix": "PO", "separator": "/", "year_style": "none", "digits": 4, "next_number": 1}
  ]', '2026-10-24') $$, 'formats and next numbers can be saved together');
select is(public.next_doc_number('invoice', '2026-10-24'), 'SBF/2026-27/246', 'E14: invoices carry on from the chosen next number');
select is(public.next_doc_number('invoice', '2026-10-25'), 'SBF/2026-27/247', 'E14: and keep counting');
select is(public.next_doc_number('quotation', '2026-10-24'), 'SBF-Q-26-27-0001', 'E14: short year and a hyphen separator');
select throws_ok($$ select public.save_doc_number_formats('[{"doc_type": "invoice", "prefix": "SBF", "separator": "/", "year_style": "full", "digits": 3, "next_number": 200}]', '2026-10-24') $$,
  'P0001', 'Invoice numbers up to 247 have already been used. The next number must be 248 or higher.',
  'the next number cannot go back over used numbers');
select lives_ok($$ select public.save_doc_number_formats('[{"doc_type": "dispatch", "prefix": "DN", "separator": "/", "year_style": "full", "digits": 4, "next_number": 5000}]', '2026-10-24') $$,
  'a next number can be set high');
select lives_ok($$ select public.save_doc_number_formats('[{"doc_type": "dispatch", "prefix": "DN", "separator": "/", "year_style": "full", "digits": 4, "next_number": 1}]', '2026-10-24') $$,
  'and lowered again before anything uses it');
select is(public.next_doc_number('dispatch', '2026-10-24'), 'DN/2026-27/0001', 'so the first delivery note is 0001');
select is(public.next_doc_number('po', '2027-03-31'), 'PO/0001', 'E14: a format without a year');
select is(public.next_doc_number('po', '2027-04-01'), 'PO/0002', 'E14: carries on across April instead of restarting');
select throws_ok($$ select public.save_doc_number_formats('[{"doc_type": "quotation", "prefix": "sbf", "separator": "/", "year_style": "full", "digits": 4}]', '2026-10-24') $$,
  'P0001', 'Each document type needs its own prefix.', 'two document types cannot share a prefix');
select tests.clear_authentication();

update public.doc_counters set last_number = 998 where doc_type = 'invoice' and series = '2026-27';
select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select is(public.next_doc_number('invoice', '2026-10-24'), 'SBF/2026-27/999', 'three digits up to 999');
select is(public.next_doc_number('invoice', '2026-10-24'), 'SBF/2026-27/1000', 'numbers outgrow their digits instead of being cut short');

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.next_doc_number('invoice', '2027-04-01') $$, '42501', 'You need an active login to do this.', 'switched-off users cannot take numbers');
select throws_ok($$ select public.save_doc_number_formats('[]', '2026-10-24') $$, '42501', 'You need an active login to do this.', 'switched-off users cannot change number formats');
select is_empty($$ update public.settings set workshop_name = 'X' returning 1 $$, 'switched-off users cannot change settings');
select tests.clear_authentication();

select results_eq(
  $$ select new_values->>'workshop_name' from public.audit_log where table_name = 'settings' and action = 'UPDATE' order by id limit 1 $$,
  $$ values ('Sri Balaji Fabricators'::text) $$, 'settings changes are in the audit log');
select results_eq(
  $$ select new_values->>'prefix' from public.audit_log where table_name = 'doc_number_formats' and action = 'UPDATE' and new_values->>'doc_type' = 'invoice' order by id limit 1 $$,
  $$ values ('SBF'::text) $$, 'number format changes are in the audit log');

select * from finish();
rollback;
