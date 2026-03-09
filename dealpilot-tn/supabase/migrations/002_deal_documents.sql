-- 002_deal_documents.sql
-- Create deal_documents table if it doesn't exist

create table if not exists deal_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  deal_id uuid references deals(id) on delete cascade,
  doc_key text,
  file_name text,
  file_url text,
  storage_path text,
  status text,
  uploaded_at timestamptz,
  user_id uuid,
  metadata jsonb
);

create index if not exists idx_deal_documents_deal_id on deal_documents(deal_id);
