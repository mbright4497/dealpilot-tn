-- Migration: add contract fields
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contract_data jsonb;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sale_price numeric;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS earnest_money numeric;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS loan_type text;
