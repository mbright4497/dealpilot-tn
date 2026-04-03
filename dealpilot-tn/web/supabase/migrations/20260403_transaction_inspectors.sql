-- Run in Supabase SQL editor or via migration. Junction: transaction ↔ inspector assignments.

create table if not exists public.transaction_inspectors (
  id uuid default gen_random_uuid() primary key,
  transaction_id integer references public.transactions (id) on delete cascade,
  inspector_id uuid references public.inspectors (id),
  user_id uuid references public.profiles (id),
  inspection_type text default 'home',
  scheduled_at timestamptz,
  completed_at timestamptz,
  report_received boolean default false,
  report_document_id uuid,
  status text default 'pending',
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_transaction_inspectors_transaction_id
  on public.transaction_inspectors (transaction_id);

create index if not exists idx_transaction_inspectors_user_id
  on public.transaction_inspectors (user_id);

alter table public.transaction_inspectors enable row level security;

drop policy if exists "own_transaction_inspectors" on public.transaction_inspectors;
create policy "own_transaction_inspectors" on public.transaction_inspectors
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
