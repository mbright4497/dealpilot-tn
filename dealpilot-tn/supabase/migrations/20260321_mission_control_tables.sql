-- Mission Control tables for tasks, projects, memories, and agent commands
-- Run this migration against your Supabase instance

CREATE TABLE IF NOT EXISTS mission_tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  column_name TEXT NOT NULL DEFAULT 'Backlog',
  assigned_agent TEXT DEFAULT NULL,
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_projects (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  owner_agent TEXT DEFAULT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_memories (
  id BIGSERIAL PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  text TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_commands (
  id BIGSERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  command TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  result TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NULL
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_mission_tasks_column ON mission_tasks(column_name);
CREATE INDEX IF NOT EXISTS idx_mission_commands_status ON mission_commands(status);
CREATE INDEX IF NOT EXISTS idx_mission_commands_agent ON mission_commands(agent_id);
