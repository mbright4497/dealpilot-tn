-- RF401 contract wizard extras (deed reference, leased-item flags, possession, etc.)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS rf401_wizard jsonb NOT NULL DEFAULT '{}'::jsonb;
