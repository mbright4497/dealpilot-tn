-- Migration: add contract_pdf_url column to deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contract_pdf_url text;
