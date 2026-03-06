-- Communications Hub: deal_communications table

CREATE TABLE IF NOT EXISTS deal_communications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  transaction_id BIGINT,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'phone', 'internal')),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'sent', 'delivered', 'failed', 'received')),
  recipient_name TEXT,
  recipient_contact TEXT,
  recipient_role TEXT CHECK (recipient_role IN ('buyer', 'seller', 'agent', 'lender', 'title_company', 'inspector', 'appraiser', 'other')),
  subject TEXT,
  body TEXT,
  ai_generated BOOLEAN DEFAULT false,
  template_key TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by transaction
CREATE INDEX IF NOT EXISTS idx_deal_comms_tx ON deal_communications(transaction_id);
CREATE INDEX IF NOT EXISTS idx_deal_comms_user ON deal_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_comms_status ON deal_communications(status);

-- RLS
ALTER TABLE deal_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_comms_user_policy ON deal_communications FOR ALL USING (auth.uid() = user_id);
