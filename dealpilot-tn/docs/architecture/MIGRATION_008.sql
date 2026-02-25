-- MIGRATION_008.sql: V2 Architecture additions

-- Enums
CREATE TYPE field_type AS ENUM ('string','number','date','select','checkbox','text','currency','boolean','json');
CREATE TYPE doc_status AS ENUM ('draft','generated','signed','archived');
CREATE TYPE compliance_status AS ENUM ('pass','warn','fail');
CREATE TYPE deal_status AS ENUM ('draft','active','under_contract','closed','cancelled');

-- document_templates
CREATE TABLE document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  doc_type text NOT NULL,
  json_schema jsonb NOT NULL,
  html_template text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- template_fields
CREATE TABLE template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES document_templates(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text,
  field_type field_type NOT NULL DEFAULT 'string',
  required boolean DEFAULT false,
  validations jsonb,
  dependencies jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON template_fields(template_id);

-- field_dependencies
CREATE TABLE field_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES document_templates(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  depends_on text NOT NULL,
  condition jsonb NOT NULL
);

-- deal_documents
CREATE TABLE deal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  template_id uuid REFERENCES document_templates(id),
  status doc_status DEFAULT 'draft',
  file_url text,
  generated_at timestamptz,
  version integer DEFAULT 1
);
CREATE INDEX ON deal_documents(deal_id);

-- deal_field_values
CREATE TABLE deal_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  template_id uuid REFERENCES document_templates(id),
  field_key text NOT NULL,
  value jsonb,
  entered_by uuid,
  entered_at timestamptz DEFAULT now()
);
CREATE INDEX ON deal_field_values(deal_id, field_key);

-- document_packages
CREATE TABLE document_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  name text,
  documents jsonb,
  created_at timestamptz DEFAULT now()
);

-- compliance_checks
CREATE TABLE compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  check_type text,
  status compliance_status DEFAULT 'warn',
  details jsonb,
  run_at timestamptz DEFAULT now()
);
CREATE INDEX ON compliance_checks(deal_id, status);

-- deadline_rules
CREATE TABLE deadline_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  expression jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- communication_log (messages)
CREATE TABLE communication_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  channel text,
  direction text,
  payload jsonb,
  sent_at timestamptz DEFAULT now()
);

-- RLS policy stubs (examples)
-- Enable row level security and create policies per tenancy/brokerage as needed
-- ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "broker_access" ON deals USING (brokerage_id = current_setting('app.current_brokerage')::uuid);

-- Note: This migration assumes table 'deals' exists from previous migrations (001-007).

-- JSON Schema example insert for RF401 template
INSERT INTO document_templates (id,name,doc_type,json_schema,created_by)
VALUES (
  gen_random_uuid(),
  'RF401 Purchase and Sale (TN)',
  'rf401',
  '{"$schema":"http://json-schema.org/draft-07/schema#","title":"RF401","type":"object","properties":{"buyer_names":{"type":"array","items":{"type":"string"}},"seller_names":{"type":"array","items":{"type":"string"}},"property":{"type":"object","properties":{"address":{"type":"string"}}},"sale_price":{"type":"number"}},"required":["buyer_names","seller_names","property","sale_price"]}'::jsonb,
  NULL
);

COMMIT;
