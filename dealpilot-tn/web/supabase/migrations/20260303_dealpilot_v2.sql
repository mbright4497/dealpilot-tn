-- supabase/migrations/20260303_dealpilot_v2.sql
-- DealPilot TN V2 core schema
-- Requires: pgcrypto extension for gen_random_uuid()

begin;

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- enum types ----------
do $$ begin
  create type public.transaction_side as enum ('buyer', 'seller');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.transaction_status as enum (
    'new',
    'under_contract',
    'inspection',
    'appraisal',
    'clear_to_close',
    'closed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_kind as enum (
    'purchase_agreement',
    'addendum',
    'disclosure',
    'inspection_report',
    'repair_request',
    'appraisal',
    'title',
    'closing',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.checklist_status as enum ('todo', 'in_progress', 'done', 'blocked');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.deadline_kind as enum (
    'binding_date',
    'inspection_end',
    'appraisal_deadline',
    'title_deadline',
    'closing_date',
    'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_channel as enum ('in_app', 'email', 'sms', 'push');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_status as enum ('pending', 'sent', 'failed', 'dismissed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.email_provider as enum ('google', 'microsoft', 'smtp');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.calendar_provider as enum ('google', 'microsoft');
exception when duplicate_object then null;
end $$;

-- ---------- profiles (optional but helpful) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text,
  brokerage text,
  phone text,
  preferences jsonb not null default '{}'::jsonb
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (id = auth.uid());

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- contacts ----------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  type text not null check (type in ('buyer','seller','lender','title','inspector','appraiser','attorney','agent','other')),
  first_name text,
  last_name text,
  email text,
  phone text,
  company text,
  notes text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_contacts_owner on public.contacts(owner_id);
create index if not exists idx_contacts_email on public.contacts(owner_id, email);

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;

drop policy if exists "contacts_select_own" on public.contacts;
create policy "contacts_select_own" on public.contacts
for select using (owner_id = auth.uid());

drop policy if exists "contacts_insert_own" on public.contacts;
create policy "contacts_insert_own" on public.contacts
for insert with check (owner_id = auth.uid());

drop policy if exists "contacts_update_own" on public.contacts;
create policy "contacts_update_own" on public.contacts
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "contacts_delete_own" on public.contacts;
create policy "contacts_delete_own" on public.contacts
for delete using (owner_id = auth.uid());

-- ---------- transactions ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status public.transaction_status not null default 'new',
  side public.transaction_side not null default 'buyer',

  -- core identifiers
  address text not null,
  city text,
  state text not null default 'TN',
  zip text,
  county text,

  client_contact_id uuid references public.contacts(id) on delete set null,

  -- dates
  binding_date date,
  closing_date date,
  inspection_end_date date,

  -- money
  purchase_price numeric(12,2),
  earnest_money numeric(12,2),

  -- computed / health / progress
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  health_score int not null default 50 check (health_score between 0 and 100),
  health_status text not null default 'attention' check (health_status in ('healthy','attention','at_risk')),
  risk_flags jsonb not null default '[]'::jsonb,

  -- source links
  mls_number text,
  notes text,

  archived_at timestamptz
);

create index if not exists idx_transactions_owner on public.transactions(owner_id);
create index if not exists idx_transactions_owner_status on public.transactions(owner_id, status);
create index if not exists idx_transactions_owner_updated on public.transactions(owner_id, updated_at desc);

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
for select using (owner_id = auth.uid());

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
for insert with check (owner_id = auth.uid());

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions
for delete using (owner_id = auth.uid());

-- ---------- documents ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  kind public.document_kind not null default 'other',
  file_name text not null,
  mime_type text not null,
  storage_bucket text not null default 'documents',
  storage_path text not null,
  size_bytes bigint not null,

  sha256 text,
  page_count int,

  -- AI metadata
  extracted_text text,
  extracted_json jsonb,
  ai_confidence numeric(4,3),

  processed_at timestamptz
);

create index if not exists idx_documents_owner on public.documents(owner_id);
create index if not exists idx_documents_tx on public.documents(transaction_id);
create index if not exists idx_documents_owner_created on public.documents(owner_id, created_at desc);

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
for select using (owner_id = auth.uid());

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
for insert with check (owner_id = auth.uid());

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
for delete using (owner_id = auth.uid());

-- ---------- contract extractions (versioned) ----------
create table if not exists public.contract_extractions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,

  created_at timestamptz not null default now(),
  model text not null,
  schema_version text not null default 'v2',
  confidence numeric(4,3),
  fields jsonb not null,
  warnings jsonb not null default '[]'::jsonb,
  raw_text_excerpt text
);

create index if not exists idx_extractions_owner on public.contract_extractions(owner_id);
create index if not exists idx_extractions_tx_created on public.contract_extractions(transaction_id, created_at desc);

alter table public.contract_extractions enable row level security;

drop policy if exists "extractions_select_own" on public.contract_extractions;
create policy "extractions_select_own" on public.contract_extractions
for select using (owner_id = auth.uid());

drop policy if exists "extractions_insert_own" on public.contract_extractions;
create policy "extractions_insert_own" on public.contract_extractions
for insert with check (owner_id = auth.uid());

drop policy if exists "extractions_delete_own" on public.contract_extractions;
create policy "extractions_delete_own" on public.contract_extractions
for delete using (owner_id = auth.uid());

-- ---------- deadlines ----------
create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  kind public.deadline_kind not null,
  label text not null,
  due_at timestamptz not null,
  all_day boolean not null default true,

  source text not null default 'system', -- system | user | ai
  derived_from jsonb not null default '{}'::jsonb,

  status text not null default 'active' check (status in ('active','done','dismissed')),
  completed_at timestamptz
);

create index if not exists idx_deadlines_owner_due on public.deadlines(owner_id, due_at);
create index if not exists idx_deadlines_tx_due on public.deadlines(transaction_id, due_at);

drop trigger if exists trg_deadlines_updated_at on public.deadlines;
create trigger trg_deadlines_updated_at
before update on public.deadlines
for each row execute function public.set_updated_at();

alter table public.deadlines enable row level security;

drop policy if exists "deadlines_select_own" on public.deadlines;
create policy "deadlines_select_own" on public.deadlines
for select using (owner_id = auth.uid());

drop policy if exists "deadlines_insert_own" on public.deadlines;
create policy "deadlines_insert_own" on public.deadlines
for insert with check (owner_id = auth.uid());

drop policy if exists "deadlines_update_own" on public.deadlines;
create policy "deadlines_update_own" on public.deadlines
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "deadlines_delete_own" on public.deadlines;
create policy "deadlines_delete_own" on public.deadlines
for delete using (owner_id = auth.uid());

-- ---------- checklist items ----------
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  title text not null,
  description text,
  status public.checklist_status not null default 'todo',
  priority int not null default 2 check (priority between 1 and 3), -- 1 high, 2 medium, 3 low

  due_at timestamptz,
  completed_at timestamptz,

  created_by text not null default 'system', -- system|ai|user
  derived_from jsonb not null default '{}'::jsonb
);

create index if not exists idx_checklist_owner_tx on public.checklist_items(owner_id, transaction_id);
create index if not exists idx_checklist_owner_due on public.checklist_items(owner_id, due_at);
create index if not exists idx_checklist_tx_status on public.checklist_items(transaction_id, status);

drop trigger if exists trg_checklist_updated_at on public.checklist_items;
create trigger trg_checklist_updated_at
before update on public.checklist_items
for each row execute function public.set_updated_at();

alter table public.checklist_items enable row level security;

drop policy if exists "checklist_select_own" on public.checklist_items;
create policy "checklist_select_own" on public.checklist_items
for select using (owner_id = auth.uid());

drop policy if exists "checklist_insert_own" on public.checklist_items;
create policy "checklist_insert_own" on public.checklist_items
for insert with check (owner_id = auth.uid());

drop policy if exists "checklist_update_own" on public.checklist_items;
create policy "checklist_update_own" on public.checklist_items
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "checklist_delete_own" on public.checklist_items;
create policy "checklist_delete_own" on public.checklist_items
for delete using (owner_id = auth.uid());

-- ---------- email templates ----------
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  category text not null default 'general',
  subject_template text not null,
  body_template text not null, -- supports {{placeholders}}
  is_system boolean not null default false
);

create index if not exists idx_email_templates_owner on public.email_templates(owner_id);

drop trigger if exists trg_email_templates_updated_at on public.email_templates;
create trigger trg_email_templates_updated_at
before update on public.email_templates
for each row execute function public.set_updated_at();

alter table public.email_templates enable row level security;

drop policy if exists "email_templates_select_own_or_system" on public.email_templates;
create policy "email_templates_select_own_or_system" on public.email_templates
for select using (is_system = true or owner_id = auth.uid());

drop policy if exists "email_templates_insert_own" on public.email_templates;
create policy "email_templates_insert_own" on public.email_templates
for insert with check (owner_id = auth.uid());

drop policy if exists "email_templates_update_own" on public.email_templates;
create policy "email_templates_update_own" on public.email_templates
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "email_templates_delete_own" on public.email_templates;
create policy "email_templates_delete_own" on public.email_templates
for delete using (owner_id = auth.uid());

-- ---------- email accounts (OAuth tokens stored encrypted at rest by Supabase; app-level secrets are still recommended) ----------
create table if not exists public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  provider public.email_provider not null,
  email text not null,

  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text[] not null default '{}'::text[],

  meta jsonb not null default '{}'::jsonb,

  unique(owner_id, provider, email)
);

create index if not exists idx_email_accounts_owner on public.email_accounts(owner_id);

drop trigger if exists trg_email_accounts_updated_at on public.email_accounts;
create trigger trg_email_accounts_updated_at
before update on public.email_accounts
for each row execute function public.set_updated_at();

alter table public.email_accounts enable row level security;

drop policy if exists "email_accounts_select_own" on public.email_accounts;
create policy "email_accounts_select_own" on public.email_accounts
for select using (owner_id = auth.uid());

drop policy if exists "email_accounts_insert_own" on public.email_accounts;
create policy "email_accounts_insert_own" on public.email_accounts
for insert with check (owner_id = auth.uid());

drop policy if exists "email_accounts_update_own" on public.email_accounts;
create policy "email_accounts_update_own" on public.email_accounts
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "email_accounts_delete_own" on public.email_accounts;
create policy "email_accounts_delete_own" on public.email_accounts
for delete using (owner_id = auth.uid());

-- ---------- email logs ----------
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,

  created_at timestamptz not null default now(),

  provider public.email_provider,
  from_email text,
  to_emails text[] not null default '{}'::text[],
  cc_emails text[] not null default '{}'::text[],
  subject text not null,
  body text not null,

  status text not null default 'draft' check (status in ('draft','queued','sent','failed')),
  provider_message_id text,
  error text
);

create index if not exists idx_email_logs_owner_created on public.email_logs(owner_id, created_at desc);
create index if not exists idx_email_logs_tx on public.email_logs(transaction_id);

alter table public.email_logs enable row level security;

drop policy if exists "email_logs_select_own" on public.email_logs;
create policy "email_logs_select_own" on public.email_logs
for select using (owner_id = auth.uid());

drop policy if exists "email_logs_insert_own" on public.email_logs;
create policy "email_logs_insert_own" on public.email_logs
for insert with check (owner_id = auth.uid());

drop policy if exists "email_logs_update_own" on public.email_logs;
create policy "email_logs_update_own" on public.email_logs
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------- calendar accounts ----------
create table if not exists public.calendar_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  provider public.calendar_provider not null,
  external_calendar_id text, -- primary or chosen

  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text[] not null default '{}'::text[],
  meta jsonb not null default '{}'::jsonb,

  unique(owner_id, provider)
);

create index if not exists idx_calendar_accounts_owner on public.calendar_accounts(owner_id);

drop trigger if exists trg_calendar_accounts_updated_at on public.calendar_accounts;
create trigger trg_calendar_accounts_updated_at
before update on public.calendar_accounts
for each row execute function public.set_updated_at();

alter table public.calendar_accounts enable row level security;

drop policy if exists "calendar_accounts_select_own" on public.calendar_accounts;
create policy "calendar_accounts_select_own" on public.calendar_accounts
for select using (owner_id = auth.uid());

drop policy if exists "calendar_accounts_insert_own" on public.calendar_accounts;
create policy "calendar_accounts_insert_own" on public.calendar_accounts
for insert with check (owner_id = auth.uid());

drop policy if exists "calendar_accounts_update_own" on public.calendar_accounts;
create policy "calendar_accounts_update_own" on public.calendar_accounts
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "calendar_accounts_delete_own" on public.calendar_accounts;
create policy "calendar_accounts_delete_own" on public.calendar_accounts
for delete using (owner_id = auth.uid());

-- ---------- calendar events (synced) ----------
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  deadline_id uuid references public.deadlines(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  provider public.calendar_provider not null,
  external_event_id text not null,
  calendar_id text,

  starts_at timestamptz not null,
  ends_at timestamptz not null,
  title text not null,
  description text,
  location text
);

create index if not exists idx_calendar_events_owner on public.calendar_events(owner_id);
create index if not exists idx_calendar_events_tx on public.calendar_events(transaction_id);

drop trigger if exists trg_calendar_events_updated_at on public.calendar_events;
create trigger trg_calendar_events_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_select_own" on public.calendar_events;
create policy "calendar_events_select_own" on public.calendar_events
for select using (owner_id = auth.uid());

drop policy if exists "calendar_events_insert_own" on public.calendar_events;
create policy "calendar_events_insert_own" on public.calendar_events
for insert with check (owner_id = auth.uid());

drop policy if exists "calendar_events_update_own" on public.calendar_events;
create policy "calendar_events_update_own" on public.calendar_events
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "calendar_events_delete_own" on public.calendar_events;
create policy "calendar_events_delete_own" on public.calendar_events
for delete using (owner_id = auth.uid());

-- ---------- notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,

  created_at timestamptz not null default now(),
  scheduled_for timestamptz not null,
  channel public.notification_channel not null default 'in_app',
  status public.notification_status not null default 'pending',

  title text not null,
  message text not null,
  action_url text,

  meta jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  error text
);

create index if not exists idx_notifications_owner_scheduled on public.notifications(owner_id, scheduled_for);
create index if not exists idx_notifications_owner_status on public.notifications(owner_id, status);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
for select using (owner_id = auth.uid());

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own" on public.notifications
for insert with check (owner_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
for delete using (owner_id = auth.uid());

-- ---------- form drafts ----------
create table if not exists public.form_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  form_code text not null, -- RF401 etc
  version text not null default '2026',
  status text not null default 'blank' check (status in ('blank','in_progress','completed')),

  fields jsonb not null default '{}'::jsonb,
  pdf_storage_bucket text,
  pdf_storage_path text
);

create index if not exists idx_form_drafts_owner on public.form_drafts(owner_id);
create index if not exists idx_form_drafts_tx on public.form_drafts(transaction_id);

drop trigger if exists trg_form_drafts_updated_at on public.form_drafts;
create trigger trg_form_drafts_updated_at
before update on public.form_drafts
for each row execute function public.set_updated_at();

alter table public.form_drafts enable row level security;

drop policy if exists "form_drafts_select_own" on public.form_drafts;
create policy "form_drafts_select_own" on public.form_drafts
for select using (owner_id = auth.uid());

drop policy if exists "form_drafts_insert_own" on public.form_drafts;
create policy "form_drafts_insert_own" on public.form_drafts
for insert with check (owner_id = auth.uid());

drop policy if exists "form_drafts_update_own" on public.form_drafts;
create policy "form_drafts_update_own" on public.form_drafts
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "form_drafts_delete_own" on public.form_drafts;
create policy "form_drafts_delete_own" on public.form_drafts
for delete using (owner_id = auth.uid());

-- ---------- activity log ----------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,

  created_at timestamptz not null default now(),
  actor text not null default 'system', -- system|ai|user
  event_type text not null,
  message text not null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_activity_owner_created on public.activity_log(owner_id, created_at desc);
create index if not exists idx_activity_tx_created on public.activity_log(transaction_id, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "activity_select_own" on public.activity_log;
create policy "activity_select_own" on public.activity_log
for select using (owner_id = auth.uid());

drop policy if exists "activity_insert_own" on public.activity_log;
create policy "activity_insert_own" on public.activity_log
for insert with check (owner_id = auth.uid());

commit;
