# ClosingPilot TN — Supabase Data Model

## Overview
Relational schema suitable for Supabase/Postgres. Includes two-sided deal model with buyer_side and seller_side data separated.

## Tables

1. deals
- id: uuid PK
- brokerage_id: uuid FK
- title: text
- status: deal_status (enum)
- created_at: timestamptz
- updated_at: timestamptz
- binding_agreement_date: date
- closing_date: date
- buyer_side_id: uuid FK -> deal_sides.id
- seller_side_id: uuid FK -> deal_sides.id

2. deal_parties
- id: uuid PK
- deal_id: uuid FK -> deals.id
- side: buyer|seller|both
- role: buyer|seller|agent|lender|escrow
- name: text
- contact_email: text
- contact_phone: text
- created_at, updated_at

3. deal_documents
- id: uuid PK
- deal_id: uuid FK
- template_id: uuid FK -> document_templates.id
- status: doc_status (enum)
- file_url: text
- generated_at: timestamptz
- version: integer

4. document_templates
- id: uuid PK
- name: text
- doc_type: rf401|addendum|disclosure|custom
- json_schema: jsonb
- html_template: text
- created_by

5. template_fields
- id: uuid PK
- template_id: uuid FK
- field_key: text
- label: text
- field_type: field_type (enum)
- required: boolean
- validations: jsonb
- dependencies: jsonb (references field_dependencies)

6. field_dependencies
- id: uuid PK
- template_id: uuid FK
- field_key: text
- depends_on: text
- condition: jsonb (e.g. {"equals":"FHA"})

7. deal_field_values
- id: uuid PK
- deal_id: uuid FK
- template_id: uuid FK
- field_key: text
- value: jsonb
- entered_by: uuid
- entered_at: timestamptz

8. deadlines
- id: uuid PK
- deal_id: uuid FK
- name: text
- due_date: date
- status: pending|completed|overdue
- rule_id: uuid FK -> deadline_rules.id

9. deadline_rules
- id: uuid PK
- name: text
- expression: jsonb (rule inputs -> offset days)
- created_by

10. tasks
- id: uuid PK
- deal_id: uuid FK
- title, description
- assigned_to: uuid
- due_date, status

11. messages (communication_log)
- id: uuid PK
- deal_id: uuid FK
- channel: sms|email|ghl|inbox
- direction: inbound|outbound
- payload: jsonb
- sent_at

12. audit_log
- id: uuid PK
- deal_id: uuid FK
- actor_id: uuid
- action: text
- metadata: jsonb
- created_at

13. document_packages
- id: uuid PK
- deal_id: uuid FK
- name: text
- documents: jsonb (array of deal_document ids)
- created_at

14. compliance_checks
- id: uuid PK
- deal_id: uuid FK
- check_type: string
- status: pass|warn|fail
- details: jsonb
- run_at


## Indexes & Relationships
- Index on deals(binding_agreement_date), deals(status), deadlines(due_date)
- FK constraints linking documents/templates/fields

## Two-sided deal model
- Implement via deal_sides table or buyer_side_id/seller_side_id on deals. Each side has independent contact lists and field_values, but shared deal_documents reference deal_id and may include side-specific fields.


