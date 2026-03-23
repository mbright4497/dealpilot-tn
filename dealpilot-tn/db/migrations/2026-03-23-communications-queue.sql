-- Schema for email/communication queue
CREATE TABLE IF NOT EXISTS public.communication_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('sms','email','voice','whatsapp','other')),
  to_address text NOT NULL,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed','cancelled')),
  provider text DEFAULT NULL,
  provider_response jsonb DEFAULT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  queued_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz DEFAULT NULL,
  last_error text DEFAULT NULL,
  CONSTRAINT communication_queue_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_communication_queue_deal ON public.communication_queue(deal_id);
CREATE INDEX IF NOT EXISTS idx_communication_queue_status ON public.communication_queue(status);

ALTER TABLE IF EXISTS public.communication_log ADD COLUMN IF NOT EXISTS queue_id uuid REFERENCES public.communication_queue(id) ON DELETE SET NULL;
