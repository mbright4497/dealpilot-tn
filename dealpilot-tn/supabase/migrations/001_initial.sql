-- 001_initial.sql
-- Tables: contacts, deals, deadlines, offer_scores, activity_log

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  email text,
  phone text,
  metadata jsonb
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text,
  buyer_contact uuid references contacts(id) on delete set null,
  seller_contact uuid references contacts(id) on delete set null,
  status text,
  value numeric,
  metadata jsonb
);

create table if not exists deadlines (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  created_at timestamptz default now(),
  name text not null,
  due_date date,
  category text,
  owner text,
  metadata jsonb,
  completed boolean default false
);

create table if not exists offer_scores (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  score integer,
  reason text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  actor text,
  action text,
  detail jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_deadlines_deal_id on deadlines(deal_id);
create index if not exists idx_deals_status on deals(status);
create index if not exists idx_activity_log_deal_id on activity_log(deal_id);

-- RLS: allow select/insert/update for authenticated role on owned rows (example)
-- Enable row level security

alter table contacts enable row level security;
alter table deals enable row level security;
alter table deadlines enable row level security;
alter table offer_scores enable row level security;
alter table activity_log enable row level security;

-- Simple policy: allow full access for service_role and anon (for tests). In production tighten these.
create policy if not exists "public_access" on contacts for all using (true) with check (true);
create policy if not exists "public_access" on deals for all using (true) with check (true);
create policy if not exists "public_access" on deadlines for all using (true) with check (true);
create policy if not exists "public_access" on offer_scores for all using (true) with check (true);
create policy if not exists "public_access" on activity_log for all using (true) with check (true);
