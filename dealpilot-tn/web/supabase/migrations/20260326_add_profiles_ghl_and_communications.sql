ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ghl_api_key TEXT,
ADD COLUMN IF NOT EXISTS ghl_location_id TEXT,
ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'TN',
ADD COLUMN IF NOT EXISTS user_type TEXT,
ADD COLUMN IF NOT EXISTS notification_email TEXT;

CREATE TABLE IF NOT EXISTS communications (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER REFERENCES deals(id),
  user_id UUID REFERENCES auth.users(id),
  type VARCHAR(10) CHECK (type IN ('email','sms','call')),
  direction VARCHAR(10) DEFAULT 'outbound',
  contact_name TEXT,
  contact_role TEXT,
  subject TEXT,
  message TEXT,
  status VARCHAR(20) DEFAULT 'sent',
  triggered_by_reva BOOLEAN DEFAULT FALSE,
  ghl_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
