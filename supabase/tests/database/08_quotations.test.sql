begin;
create extension if not exists pgtap with schema extensions;
select plan(32);
select tests.create_user('11111111-1111-1111-1111-111111111111', 'asha@steelflow.test', 'Asha Rao');
select tests.create_user('22222222-2222-2222-2222-222222222222', 'ravi@steelflow.test', 'Ravi Kumar');
update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';

select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
insert into public.customers (id, name) values
  ('a0000000-0000-0000-0000-000000000001', 'Sharma Steel Traders'),
  ('a0000000-0000-0000-0000-000000000002', 'Old Customer');
update public.customers set is_active = false where id = 'a0000000-0000-0000-0000-000000000002';

-- E10: a ₹1,00,000 cost sheet at 15% with one lump-sum item.
select lives_ok($$ select public.save_quotation_draft(null,
  jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000001', 'title', 'Warehouse shed',
    'scope', 'Shed 40x80 with sheeting', 'quote_date', public.today_ist(), 'margin_percent', 15),
  '[{"category":"material","description":"Steel","qty":1,"unit":"lot","cost_rate":60000},
    {"category":"labour","description":"Fabrication","qty":1,"unit":"job","cost_rate":25000},
    {"category":"painting","description":"Paint","qty":1,"unit":"job","cost_rate":10000},
    {"category":"transport","description":"Trips","qty":1,"unit":"job","cost_rate":5000}]'::jsonb,
  '[{"description":"Supply, fabrication and erection as per scope of work","qty":1,"unit":"job","rate":115000}]'::jsonb) $$,
  'an active user saves a draft quotation');
select results_eq($$ select quote_no, revision, status from public.quotations where title = 'Warehouse shed' $$,
  $$ values ('QT/' || public.financial_year(public.today_ist()) || '/0001', 0, 'draft'::text) $$, 'a new quotation gets the next number');
select results_eq($$ select cost_total, subtotal, gst_rate, gst_amount, round_off, grand_total from public.quotations where title = 'Warehouse shed' $$,
  $$ values (100000.00::numeric, 115000.00::numeric, null::numeric, 0.00::numeric, 0.00::numeric, 115000.00::numeric) $$,
  'E10: ₹1,00,000 at 15% is priced at ₹1,15,000');

select lives_ok($$ select public.save_quotation_draft(null,
  jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000001', 'title', 'Angle railing', 'quote_date', public.today_ist(), 'margin_percent', 15),
  '[]'::jsonb, '[{"description":"ISA 40x40x5 railing","qty":12.5,"unit":"m","rate":219.65}]'::jsonb) $$, 'a draft with paise saves');
select results_eq($$ select i.amount, q.subtotal, q.round_off, q.grand_total from public.quotations q
    join public.quotation_items i on i.quotation_id = q.id where q.title = 'Angle railing' $$,
  $$ values (2745.63::numeric, 2745.63::numeric, 0.37::numeric, 2746.00::numeric) $$,
  'line amounts round half up to the paisa and the total to the rupee');
select throws_ok($$ select public.save_quotation_draft(null,
  jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000002', 'title', 'Old', 'quote_date', public.today_ist(), 'margin_percent', 15),
  '[]'::jsonb, '[]'::jsonb) $$, 'P0001', 'This customer is switched off. Switch them on before quoting.', 'a switched-off customer cannot be quoted');

select tests.clear_authentication();
update public.settings set gst_enabled = true, gstin = '36ABCDE1234F1Z5', state = 'Telangana', default_gst_rate = 18 where id = 1;
select tests.authenticate_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ select public.save_quotation_draft((select id from public.quotations where title = 'Angle railing'),
  jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000001', 'title', 'Angle railing', 'quote_date', public.today_ist(), 'margin_percent', 15),
  '[]'::jsonb, '[{"description":"Railing","qty":1,"unit":"job","rate":100000}]'::jsonb) $$, 'a draft is saved again');
select results_eq($$ select gst_rate, gst_amount, grand_total from public.quotations where title = 'Angle railing' $$,
  $$ values (18.00::numeric, 18000.00::numeric, 118000.00::numeric) $$, 'with GST on, the rate from Settings is added');
select tests.clear_authentication();
update public.settings set gst_enabled = false where id = 1;
select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

select throws_ok($$ insert into public.quotations (quote_no, customer_id, title) values ('X', 'a0000000-0000-0000-0000-000000000001', 'Sneaky') $$,
  '42501', null, 'quotations are only written through SteelFlow''s functions');
select throws_ok($$ update public.quotations set title = 'Changed' $$, '42501', null, 'a quotation''s details cannot be changed directly');
select lives_ok($$ update public.quotations set follow_up_date = public.today_ist() where title = 'Warehouse shed' $$, 'the follow-up date can be set directly');
select throws_ok($$ delete from public.quotations $$, '42501', null, 'quotations are never deleted');

select throws_ok($$ select public.set_quotation_status((select id from public.quotations where title = 'Warehouse shed'), 'accepted') $$,
  'P0001', 'This quotation is draft, so it cannot be marked accepted.', 'a draft cannot be accepted before it is sent');
select lives_ok($$ select public.set_quotation_status((select id from public.quotations where title = 'Warehouse shed'), 'sent') $$, 'a draft is sent');
select isnt((select sent_at from public.quotations where title = 'Warehouse shed'), null, 'sending records when');
select throws_ok($$ select public.save_quotation_draft((select id from public.quotations where title = 'Warehouse shed'),
  jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000001', 'title', 'Warehouse shed', 'quote_date', public.today_ist(), 'margin_percent', 15),
  '[]'::jsonb, '[]'::jsonb) $$, 'P0001', 'This quotation has been sent, so it can no longer be edited. Revise it to make changes.', 'a sent quotation is locked');

select public.save_quotation_draft(null, jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000001',
  'title', 'Empty enquiry', 'quote_date', public.today_ist(), 'margin_percent', 15), '[]'::jsonb, '[]'::jsonb);
select throws_ok($$ select public.set_quotation_status((select id from public.quotations where title = 'Empty enquiry'), 'sent') $$,
  'P0001', 'Add at least one item before sending.', 'an empty quotation cannot be sent');
select lives_ok($$ select public.set_quotation_status((select id from public.quotations where title = 'Empty enquiry'), 'rejected', '  Customer went elsewhere ') $$,
  'an enquiry that went nowhere is closed as rejected');
select is((select rejection_reason from public.quotations where title = 'Empty enquiry'), 'Customer went elsewhere', 'the reason is kept');

select lives_ok($$ select public.create_quotation_revision((select id from public.quotations where title = 'Warehouse shed' and revision = 0)) $$,
  'a sent quotation is revised');
select results_eq($$ select revision, status from public.quotations where title = 'Warehouse shed' order by revision $$,
  $$ values (0, 'superseded'::text), (1, 'draft'::text) $$, 'the old revision is replaced by a new draft');
select results_eq($$ select count(*)::int from public.quotation_cost_lines l join public.quotations q on q.id = l.quotation_id
    where q.title = 'Warehouse shed' and q.revision = 1 $$, $$ values (4) $$, 'the cost sheet is copied to the revision');
select throws_ok($$ select public.create_quotation_revision((select id from public.quotations where title = 'Warehouse shed' and revision = 0)) $$,
  'P0001', 'Only a sent or rejected quotation can be revised.', 'a replaced revision cannot be revised again');

select tests.clear_authentication();
select throws_ok($$ insert into public.quotation_items (quotation_id, sort_order, description, qty, rate, amount)
  values ((select id from public.quotations where title = 'Warehouse shed' and revision = 0), 9, 'Extra', 1, 1, 1) $$,
  'P0001', 'This quotation has been sent, so its lines can no longer be changed. Revise it to make changes.', 'lines of a sent quotation are locked');
select tests.authenticate_as('11111111-1111-1111-1111-111111111111');

select public.set_quotation_status((select id from public.quotations where title = 'Warehouse shed' and revision = 1), 'sent');
select public.set_quotation_status((select id from public.quotations where title = 'Warehouse shed' and revision = 1), 'accepted');
select lives_ok($$ select public.convert_quotation((select id from public.quotations where title = 'Warehouse shed' and revision = 1)) $$,
  'an accepted quotation becomes a project');
select results_eq($$ select p.title, p.description, p.contract_value, p.est_material, p.est_labour, p.est_painting, p.est_transport, p.est_other
    from public.projects p join public.quotations q on q.project_id = p.id and p.quotation_id = q.id
    where q.title = 'Warehouse shed' and q.revision = 1 $$,
  $$ values ('Warehouse shed'::text, 'Shed 40x80 with sheeting'::text, 115000.00::numeric, 60000.00::numeric, 25000.00::numeric,
    10000.00::numeric, 5000.00::numeric, 0.00::numeric) $$, 'the project carries the price and the cost sheet as estimates');
select throws_ok($$ select public.convert_quotation((select id from public.quotations where title = 'Warehouse shed' and revision = 1)) $$,
  'P0001', null, 'a quotation becomes a project only once');
select results_eq($$ select is_overdue from public.project_list_v where title = 'Warehouse shed' $$, $$ values (false) $$,
  'a project with no due date is not overdue');

select public.set_quotation_status((select id from public.quotations where title = 'Angle railing'), 'sent');
update public.quotations set follow_up_date = public.today_ist() where title = 'Angle railing';
select results_eq($$ select is_follow_up_due from public.quotation_list_v where title = 'Angle railing' $$, $$ values (true) $$,
  'a sent quotation due for follow-up is flagged');

select tests.authenticate_as('22222222-2222-2222-2222-222222222222');
select is_empty($$ select id from public.quotations $$, 'switched-off users see no quotations');
select throws_ok($$ select public.save_quotation_draft(null, jsonb_build_object('customer_id', 'a0000000-0000-0000-0000-000000000001',
  'title', 'Nope', 'quote_date', public.today_ist(), 'margin_percent', 15), '[]'::jsonb, '[]'::jsonb) $$,
  '42501', null, 'switched-off users cannot save quotations');
select tests.clear_authentication();
select ok((select count(*) from public.audit_log where table_name = 'quotations') > 0, 'quotations are audited');

select * from finish();
rollback;
