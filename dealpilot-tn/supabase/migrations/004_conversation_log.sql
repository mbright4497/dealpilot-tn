-- 004_conversation_log.sql
create table if not exists conversation_log (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  sender text,
  message text,
  intent text,
  response text,
  created_at timestamptz default now()
);
create index if not exists idx_conversation_log_deal_id on conversation_log(deal_id);
