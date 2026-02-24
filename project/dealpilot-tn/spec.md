# DealPilot TN — Project Spec

## Overview
DealPilot TN is a mobile-first AI Transaction Coordinator app for Tennessee real estate agents. Replaces a human TC; built by an agent for agents. Core v1 focus: deterministic TC Engine to extract contract data from TN forms and generate timelines, checklists, and audit trails.

## References
- TN legal knowledge GPT: https://chatgpt.com/g/g-698b5e8a23708191a942e326bb32b23e-my-chat-tennessee-real-estate-ai
- Existing agent dashboard (AppSheet): https://www.appsheet.com/newshortcut/e0b5c94d-c290-4322-9f56-44c496188a70
- GHL integration: HubLinkPro (already wired)

## Architecture
- Frontend: TypeScript, PWA (mobile-first), React (Vite or Next.js if needed), responsive UI
- Backend: TypeScript (Node.js) serverless functions or lightweight Express service
- Data store: Supabase for structured deal records and audit trails
- Forms storage: JSON Schema for each TN form (RF401, RF403, RF625, RF656, RF653, RF654, RF655, RF660, RF657, etc.)
- Processing: deterministic rule engine (no LLMs for deadlines/form selection). LLMs limited to optional guidance text only.
- Transcription: Whisper (for voice mode) — Phase 3
- Integrations: GHL (webhooks), optional AppSheet adapter, Make.com for workflows
- Auth: JWT with GHL OAuth mapping per sub-account

## Data Models
- Deal
  - id, agent_id, buyer/seller info, property, contract_date, status, created_at, updated_at, deal_type (resale | new_construction | lot_land), financing_type (conventional | FHA | VA | cash | USDA)
- FormSchema
  - id, name (RF401/RF403/RF625/etc.), version, json_schema, field_mappings
- FormInstance
  - id, deal_id, form_schema_id, raw_pdf_text, structured_data (JSON), uploaded_at
- TimelineEvent
  - id, deal_id, event_type (inspection, appraisal, financing_deadline, closing), due_date, source_form, calculated_at, status, cure_period_days, notification_form, source_section
- ChecklistItem
  - id, deal_id, title, description, owner, due_date, completed, tags
- AuditLog
  - id, deal_id, actor, action, details, timestamp
- FormDependency
  - id, parent_form_schema_id, child_form_schema_id, trigger_condition

## Deadline Calculator Rules
- Deterministic rule set per TN form and contract clauses
- RF401-specific deadlines (from contract language):
  - Section 2.B: Within 3 days of Binding Agreement Date (BAD), Buyer must make loan application and pay for credit report
  - Section 2.B: Appraisal must be ordered within 14 days of BAD, appraisal fee paid
  - Section 2.C (Lines 99-116): Appraisal contingency — if appraisal comes in low, Buyer has 3 days to waive or terminate
  - Section 5: Cash deals — financial contingency proof required within 5 days
  - Section 8.D: Inspection Period = user-entered number of days after BAD
  - Section 8.D(3): Resolution Period = mutually agreed days after inspection period ends
  - RF656 used for ALL notifications between buyer/seller (not agent notifications)
  - 2-day cure/warning period for defaults before termination rights kick in
  - Final inspection: on closing date or within specified days prior
  - FHA/VA loans (RF625): longer appraisal windows and VA/FHA-specific requirements override RF401 defaults
- Rule engine: expressible as ordered rules with priority; support overrides per-deal

## RF403 — New Construction specifics
- RF403 differs from RF401 in ways critical for new construction transactions:
  - Change Orders must be in writing and signed by both parties
  - No subcontractor authority to agree to changes unless explicitly delegated
  - Punch list / inspection process differs (New Construction Inspection/Punch List Amendment)
  - Seller must be a licensed TN contractor or engage one; warranty and licensing clauses apply
  - Substantial completion notification triggers inspection and certain deadlines

## Phase 1 Build Plan — TC Engine
Objective: Contract-to-timeline pipeline that ingests TN form PDFs (or structured input) and outputs timeline events + checklists.

Tasks (breakdown for Workhorse):
1. Project scaffolding
   - Create repo structure: /src, /schemas, /scripts, /tests, /docs
   - Setup TypeScript, lint, tests, basic Dockerfile
2. Form schemas
   - Define JSON schemas for RF401 and RF403 (initial two forms)
   - Create field mapping docs (contract_date, inspection_period_days, financing_deadline_field, etc.)
2.5. RF656 Notification schema and trigger rules
   - Define full RF656 JSON schema covering 34+ checkbox notification types
   - Implement trigger rules and mappings for when RF656 should be generated (e.g., low appraisal, repair requests, deadline notices)
3. PDF/text ingestion
   - Build parser to extract text from PDF (pdf-parse or Tika)
   - Implement structured-extraction pipeline to map extracted text to FormInstance JSON using heuristics and regexes
4. Rule engine
   - Implement deterministic rule engine that consumes FormInstance + deal data and emits TimelineEvent list
   - Unit tests for core rules (inspection, appraisal, financing, closing)
5. Checklist generator
   - Rules to turn TimelineEvents into ChecklistItems with owners and due_dates
6. API endpoints
   - POST /deals (create deal)
   - POST /deals/:id/forms (upload form PDF -> returns FormInstance)
   - GET /deals/:id/timeline (returns events)
7. Storage
   - Implement Supabase schema + migrations for models
8. Testing & QA
   - Add unit and integration tests, sample PDFs, and test cases
9. Deployment
   - Docker-compose or serverless deploy script

Deliverables for Phase 1
- Repo scaffold with initial code and tests
- JSON schemas for RF401 & RF403 and RF656 notification schema
- Working pipeline: upload PDF -> parsed form -> generated timeline events
- API docs and Postman collection

## TN Forms Index
List of TN REALTORS residential forms to support (Phase 1 priority marked):
- RF101
- RF141
- RF201
- RF203
- RF304
- RF401 (Phase 1 priority)
- RF403 (Phase 1 priority - new construction)
- RF404
- RF421
- RF461
- RF481
- RF482
- RF501
- RF505
- RF506
- RF601
- RF621-RF665
- RF656 (Phase 1 priority - notifications)
- RF660
- RF662
- RF663

## Risks & Notes
- PDF extraction accuracy depends on source quality; may need manual fields for edge cases
- Legal accuracy: deadlines follow TN contract language — validate with attorney or TN forms expert
- LLMs avoided for deterministic tasks; can be used later for natural-language guidance
- RF403 (new construction) has a 12-page form with construction-specific clauses not present in RF401. Since the operator specializes in new construction, RF403 support is equally critical to RF401 and must not be treated as secondary.

## Next Steps
- Confirm spec edits applied. After your approval, I will spawn Workhorse with Phase 1 task list to begin implementation. Do NOT start coding until you confirm.

-- spec updated: 2026-02-23
