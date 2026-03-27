create table if not exists public.transaction_contacts (
  id uuid primary key default gen_random_uuid(),
  transaction_id integer references public.transactions(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  role text not null,
  name text not null,
  phone text,
  email text,
  company text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_transaction_contacts_transaction_id
  on public.transaction_contacts(transaction_id);

create index if not exists idx_transaction_contacts_user_id
  on public.transaction_contacts(user_id);

alter table public.transaction_contacts enable row level security;

drop policy if exists "owner access" on public.transaction_contacts;
create policy "owner access"
  on public.transaction_contacts
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
