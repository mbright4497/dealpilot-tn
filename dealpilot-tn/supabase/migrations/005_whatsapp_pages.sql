-- 005_whatsapp_pages.sql
create table if not exists whatsapp_pages (
  id uuid primary key default gen_random_uuid(),
  page_name text,
  phone_number_id text,
  whatsapp_token text,
  business_id text,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_whatsapp_pages_phone_number_id on whatsapp_pages(phone_number_id);
