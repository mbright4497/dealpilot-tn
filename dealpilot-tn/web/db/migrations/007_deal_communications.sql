CREATE TABLE IF NOT EXISTS deal_communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deal_state(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comm_type TEXT NOT NULL CHECK (comm_type IN ('email','sms','call','note')),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  recipient TEXT,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','delivered','failed')),
  ai_generated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deal_comms_deal ON deal_communications(deal_id);
CREATE INDEX idx_deal_comms_user ON deal_communications(user_id);
CREATE INDEX idx_deal_comms_type ON deal_communications(comm_type);

ALTER TABLE deal_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_comms_tenant ON deal_communications USING (user_id = auth.uid());
