-- Create communication_log table for messaging history

create table if not exists public.communication_log (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete set null,
  deal_id uuid,
  channel text not null check (channel in ('sms','email')),
  recipient text,
  subject text,
  body text,
  status text not null default 'queued' check (status in ('queued','sent','delivered','failed','mock')),
  provider text not null default 'ghl',
  provider_response jsonb default '{}'::jsonb,
  sent_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_communication_log_contact on public.communication_log(contact_id);
create index if not exists idx_communication_log_deal on public.communication_log(deal_id);

create trigger if not exists trg_communication_log_updated_at
before update on public.communication_log
for each row execute function public.set_updated_at();
