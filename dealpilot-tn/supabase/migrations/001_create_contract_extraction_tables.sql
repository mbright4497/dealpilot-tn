-- 001_create_contract_extraction_tables.sql
-- Step 1 migrations for Contract-to-Deal Engine

-- 1) document_extractions
CREATE TABLE IF NOT EXISTS document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  raw_text text,
  extraction_json jsonb,
  model text,
  created_at timestamptz DEFAULT now()
);

-- 2) transaction_parties
CREATE TABLE IF NOT EXISTS transaction_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  role text,
  name text,
  email text,
  phone text
);

-- 3) transaction_terms
CREATE TABLE IF NOT EXISTS transaction_terms (
  transaction_id uuid PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
  purchase_price numeric,
  earnest_money numeric,
  earnest_money_due_date date,
  closing_date date,
  binding_date date,
  inspection_deadline date,
  appraisal_deadline date,
  financing_type text,
  special_stipulations text
);
