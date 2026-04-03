-- Earnest money confirmation tracking (run in SQL editor if migration not applied)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS earnest_money_confirmed BOOLEAN DEFAULT false;

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS earnest_money_confirmed_at TIMESTAMPTZ;
