-- seed_dev.sql

insert into contacts (id, name, email, phone, metadata) values
  ('00000000-0000-0000-0000-000000000001', 'Alice Buyer', 'alice@example.com', '555-0101', '{"role":"buyer"}'),
  ('00000000-0000-0000-0000-000000000002', 'Bob Buyer', 'bob@example.com', '555-0102', '{"role":"buyer"}'),
  ('00000000-0000-0000-0000-000000000003', 'Carol Seller', 'carol@example.com', '555-0103', '{"role":"seller"}'),
  ('00000000-0000-0000-0000-000000000004', 'Dan Agent', 'dan@example.com', '555-0104', '{"role":"agent"}'),
  ('00000000-0000-0000-0000-000000000005', 'Eve Lender', 'eve@example.com', '555-0105', '{"role":"lender"}');

insert into deals (id, title, buyer_contact, seller_contact, status, value, metadata) values
  ('10000000-0000-0000-0000-000000000001', 'Lot 12 - New Build', '00000000-0000-0000-0000-000000000001', null, 'open', 320000, '{}'),
  ('10000000-0000-0000-0000-000000000002', 'Spec Home - Maple', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'under_contract', 275000, '{}'),
  ('10000000-0000-0000-0000-000000000003', 'Builder Offer - Pine', null, '00000000-0000-0000-0000-000000000003', 'closed', 410000, '{}');

insert into deadlines (id, deal_id, name, due_date, category, owner, metadata, completed) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Submit appraisal follow-up', '2026-04-01', 'loan-obligation', 'loan-team', '{"tags":["loan-obligation"], "description":"Confirm with appraisal vendor", "source_form":"rf401"}', false),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Final walkthrough', '2026-03-20', 'inspection', 'client', '{"tags":["inspection"], "description":"Schedule final walkthrough"}', false);

insert into offer_scores (id, deal_id, score, reason, metadata) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 75, 'competitive market', '{}');

insert into activity_log (id, deal_id, actor, action, detail) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'system', 'seed', '{"note":"seeded"}');
