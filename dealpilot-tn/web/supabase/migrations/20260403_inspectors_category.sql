-- Run in Supabase (or apply via migration):
alter table public.inspectors
  add column if not exists category text default 'inspector';
