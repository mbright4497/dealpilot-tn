-- Manual + timeline-friendly transaction activity records
create table if not exists public.transaction_activity (
  id uuid primary key default gen_random_uuid(),
  transaction_id integer not null references public.transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_transaction_activity_transaction_created
  on public.transaction_activity(transaction_id, created_at desc);
create index if not exists idx_transaction_activity_user_created
  on public.transaction_activity(user_id, created_at desc);

alter table public.transaction_activity enable row level security;

drop policy if exists "owner access" on public.transaction_activity;
create policy "owner access"
  on public.transaction_activity
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
