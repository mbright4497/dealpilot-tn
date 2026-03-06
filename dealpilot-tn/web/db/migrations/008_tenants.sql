-- Tenants table: maps DealPilot users to GHL sub-accounts
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ghl_location_id TEXT UNIQUE,
  ghl_api_key TEXT,
  owner_user_id UUID NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','enterprise')),
  comms_email_limit INT DEFAULT 500,
  comms_sms_limit INT DEFAULT 100,
  comms_email_used INT DEFAULT 0,
  comms_sms_used INT DEFAULT 0,
  billing_cycle_start TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link users to tenants (multi-user per tenant for teams/brokerages)
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('owner','admin','agent','tc')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenants_ghl ON tenants(ghl_location_id);
CREATE INDEX idx_tenants_owner ON tenants(owner_user_id);
CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);

-- RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenants_owner_policy ON tenants USING (owner_user_id = auth.uid());
CREATE POLICY tenant_users_member_policy ON tenant_users USING (user_id = auth.uid());
