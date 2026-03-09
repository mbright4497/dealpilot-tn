-- Add value column to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS value numeric;
-- backfill: set from metadata.sale_price if present (best-effort)
UPDATE transactions SET value = (metadata->>'sale_price')::numeric WHERE (value IS NULL OR value = 0) AND metadata ? 'sale_price';
