-- Add delivery tracking fields to communication tables

ALTER TABLE IF EXISTS public.communication_queue
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_communication_queue_delivery_status ON public.communication_queue(delivery_status);
CREATE INDEX IF NOT EXISTS idx_communication_queue_delivered_at ON public.communication_queue(delivered_at);

ALTER TABLE IF EXISTS public.communication_log
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_communication_log_delivery_status ON public.communication_log(delivery_status);
CREATE INDEX IF NOT EXISTS idx_communication_log_delivered_at ON public.communication_log(delivered_at);
CREATE INDEX IF NOT EXISTS idx_communication_log_attempts ON public.communication_log(attempts);
