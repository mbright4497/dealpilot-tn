alter table if exists public.deals
add column if not exists documents_received jsonb not null default '{}'::jsonb;
