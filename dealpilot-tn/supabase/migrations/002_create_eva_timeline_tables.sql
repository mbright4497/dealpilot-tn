-- 002_create_eva_timeline_tables.sql
-- EVA Autopilot Timeline tables

-- 1) deal_deadlines
CREATE TABLE IF NOT EXISTS deal_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  code text,
  label text,
  due_at timestamptz,
  status text DEFAULT 'upcoming', -- upcoming|due|overdue|complete|waived
  source text,
  confidence numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 2) deal_checklist_items
CREATE TABLE IF NOT EXISTS deal_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  stage text,
  label text,
  owner_role text,
  status text DEFAULT 'todo', -- todo|doing|done|blocked
  due_at timestamptz,
  created_by text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- 3) eva_daily_runs
CREATE TABLE IF NOT EXISTS eva_daily_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  run_at timestamptz DEFAULT now(),
  summary text,
  actions_json jsonb,
  health_delta jsonb
);
