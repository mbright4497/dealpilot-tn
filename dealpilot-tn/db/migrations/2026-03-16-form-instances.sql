-- Migration: create form_instances table for Phase 21
CREATE TABLE IF NOT EXISTS form_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  form_id TEXT NOT NULL,
  form_version TEXT NOT NULL,
  instance_label TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  current_step INTEGER NOT NULL DEFAULT 1,
  field_data JSONB NOT NULL DEFAULT '{}',
  ai_fill_log JSONB DEFAULT '[]',
  validation_state JSONB DEFAULT '{}',
  parent_form_instance_id UUID REFERENCES form_instances(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  exported_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_fi_transaction ON form_instances(transaction_id);
CREATE INDEX IF NOT EXISTS idx_fi_form_id ON form_instances(form_id);
CREATE INDEX IF NOT EXISTS idx_fi_status ON form_instances(status);
ALTER TABLE form_instances ENABLE ROW LEVEL SECURITY;
-- NB: the following policy is permissive; adapt to your auth model
CREATE POLICY IF NOT EXISTS "Users can manage own form instances" ON form_instances FOR ALL USING (true);
