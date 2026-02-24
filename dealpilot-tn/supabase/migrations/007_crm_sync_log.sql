-- 007_crm_sync_log.sql
create table if not exists crm_sync_log (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references deals(id) on delete cascade,
  crm_system text,
  operation text,
  request_payload jsonb,
  response_status int,
  error_message text,
  created_at timestamptz default now()
);
create index if not exists idx_crm_sync_log_tx on crm_sync_log(transaction_id);
