-- 006_phase_transitions.sql
create table if not exists phase_transitions (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references deals(id) on delete cascade,
  from_phase text,
  to_phase text,
  triggered_by text,
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_phase_transitions_tx on phase_transitions(transaction_id);
