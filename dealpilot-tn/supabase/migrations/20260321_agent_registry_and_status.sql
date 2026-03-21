-- Agent Registry + Status tables for Mission Control <-> OpenClaw unification
-- Provides single source of truth for agent identity, real-time status, and activity logs

-- 1. Agent Registry: maps display names to OpenClaw agent IDs
CREATE TABLE IF NOT EXISTS agent_registry (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  openclaw_agent_id TEXT NOT NULL,
  color TEXT DEFAULT 'bg-blue-500',
  avatar_emoji TEXT DEFAULT NULL,
  is_leader BOOLEAN DEFAULT FALSE,
  office_x INTEGER DEFAULT 0,
  office_y INTEGER DEFAULT 0,
  tools TEXT[] DEFAULT '{}',
  model TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Agent Status: real-time heartbeat and activity state
CREATE TABLE IF NOT EXISTS agent_status (
  agent_id TEXT PRIMARY KEY REFERENCES agent_registry(id),
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','working','error','offline')),
  current_task TEXT DEFAULT NULL,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  last_command_id BIGINT DEFAULT NULL,
  session_key TEXT DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Agent Activity Log: full history of commands, heartbeats, results
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id BIGSERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agent_registry(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('command','heartbeat','result','error','spawn','status_change')),
  source TEXT NOT NULL DEFAULT 'mission_control' CHECK (source IN ('mission_control','openclaw','heartbeat','webhook')),
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_agent_status_status ON agent_status(status);
CREATE INDEX IF NOT EXISTS idx_agent_activity_agent ON agent_activity_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_type ON agent_activity_log(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_activity_created ON agent_activity_log(created_at DESC);

-- Seed the agent registry with the team
-- Tango is the LEADER (orchestrator). Everyone else reports to Tango.
INSERT INTO agent_registry (id, display_name, role, openclaw_agent_id, color, is_leader, office_x, office_y, model) VALUES
  ('tango', 'Tango', 'Leader / Orchestrator', 'main', 'bg-amber-500', TRUE, 4, 1, 'gpt-5.1-codex-mini'),
  ('marcus', 'Marcus', 'COO', 'ops', 'bg-blue-500', FALSE, 2, 1, 'gpt-5.1-codex-mini'),
  ('dev', 'Dev', 'Software Engineer', 'coder', 'bg-green-500', FALSE, 5, 2, 'gpt-5.2-codex'),
  ('reva', 'Reva', 'Transaction Coordinator', 'tc-agent', 'bg-purple-500', FALSE, 1, 3, 'gpt-5.1-codex-mini'),
  ('carlos', 'Carlos', 'Lead Gen & CRM Manager', 'crm-agent', 'bg-yellow-400', FALSE, 6, 1, 'gpt-5.1-codex-mini'),
  ('nina', 'Nina', 'Content & Marketing Director', 'content-agent', 'bg-pink-500', FALSE, 3, 4, 'gpt-5.1-codex-mini'),
  ('maya', 'Maya', 'Client Success & Booking', 'booking-agent', 'bg-cyan-400', FALSE, 7, 3, 'gpt-5.1-codex-mini')
ON CONFLICT (id) DO NOTHING;

-- Seed initial status rows (all idle)
INSERT INTO agent_status (agent_id, status) VALUES
  ('tango', 'idle'),
  ('marcus', 'idle'),
  ('dev', 'idle'),
  ('reva', 'idle'),
  ('carlos', 'idle'),
  ('nina', 'idle'),
  ('maya', 'idle')
ON CONFLICT (agent_id) DO NOTHING;

-- Enable Supabase Realtime on status table for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE agent_status;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_activity_log;
