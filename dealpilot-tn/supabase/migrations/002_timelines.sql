-- 002_timelines.sql
create table if not exists deal_timelines (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  name text not null,
  due_date date,
  category text,
  owner text,
  metadata jsonb,
  created_at timestamptz default now(),
  completed boolean default false
);
create index if not exists idx_deal_timelines_deal_id on deal_timelines(deal_id);
