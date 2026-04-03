create table if not exists public.inspectors (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  company text,
  phone text,
  email text,
  booking_method text default 'call',
  booking_url text,
  specialties text[] default '{}',
  notes text,
  preferred boolean default false,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_inspectors_user_id on public.inspectors (user_id);
create index if not exists idx_inspectors_user_active on public.inspectors (user_id) where active = true;

drop trigger if exists trg_inspectors_updated_at on public.inspectors;
create trigger trg_inspectors_updated_at
before update on public.inspectors
for each row execute function public.set_updated_at();

alter table public.inspectors enable row level security;

drop policy if exists "own_inspectors" on public.inspectors;
create policy "own_inspectors" on public.inspectors
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
