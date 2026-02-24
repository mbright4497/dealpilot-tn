-- updated notifications table (ensure exists)
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references deals(id) on delete cascade,
  type text,
  recipient jsonb,
  channel text,
  message text,
  urgency text,
  status text default 'pending',
  scheduled_at date,
  sent_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_tx on notifications(transaction_id);
