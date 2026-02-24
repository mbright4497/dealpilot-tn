-- 003_notifications.sql
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  recipient text,
  channel text,
  template text,
  payload jsonb,
  sent_at timestamptz,
  status text,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_deal_id on notifications(deal_id);
