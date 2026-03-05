-- Migration: create message_logs table

CREATE TABLE IF NOT EXISTS message_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid,
  contact_id uuid,
  channel text,
  template_key text,
  message_body text,
  sent_at timestamptz,
  ghl_message_id text,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_message_logs_deal_id ON message_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_contact_id ON message_logs(contact_id);
