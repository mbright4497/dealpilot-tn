# DealPilot TN — Product Requirements Document (PRD)

## Executive Summary
DealPilot TN is a Tennessee-specialized transactional platform to manage purchase-and-sale deals, document generation (RF401 and related forms), two-sided deal representation, compliance auditing, and voice/chat guided document filling. The product targets brokerages and brokers (transaction coordinators) in Tennessee, ensuring RF401/RF623/RF656 compliance while enabling faster deal turnaround and reduced fall-throughs.

## Core Modules
1. Deal Manager — create/manage deals, two-sided roles (buyer_side, seller_side), status lifecycle, milestones.
2. Document Engine — template-driven doc generation, PDF/HTML rendering, package creation, versioning.
3. Form Filler (voice/chat) — conversational UI for guided field collection with stateful resumability.
4. Deadline/Timeline Engine — compute, track, and recalc deadlines; escalation and task generation.
5. Compliance Auditor — rules engine to validate required fields, addenda selection, and state-specific checks (TN RF forms).
6. Communication Hub — multi-channel messaging (email, SMS, GHL webhook), threaded messages tied to deals.
7. Two-Sided Deal Model — full parity for buyer_side and seller_side data, parallel document flows.
8. RF401 Smart Forms — canonical RF401 schema with conditional logic and addendum selector.

## Screen Inventory & User Flows
- Dashboard (active deals, upcoming deadlines, alerts)
- Deal Page (overview, timeline, parties, documents, tasks)
- Document Editor (preview, fill, request signatures)
- Conversational Fill UI (voice/chat widget)
- Compliance Console (checks, exceptions, remediation)
- Task Manager (agent assignments, contact actions)

User flows: Create Deal -> Add Parties -> Guided RF401 fill (conversational or form) -> Generate document package -> Run Compliance Checks -> Send for signature -> Close deal.

## Tennessee-specific Requirements
- Support RF401 (Tennessee REALTORS Purchase & Sale Agreement), RF623, RF656, and common addenda.
- RF401-specific validations: lines/clauses mapping, conditional addenda for FHA/VA/USDA, fuel tank disclosures, lease assumptions.
- Store reference copies of Tennessee-specific addenda templates and mapping rules.

## Acceptance Criteria
- RF401 can be fully completed via conversational flow with 95% mapping accuracy to required fields.
- Deadline Engine auto-calculates standard timelines and surfaces alerts per SLA.
- Compliance Auditor flags missing/contradictory fields and suggests remedial actions.

## Non-functional Requirements
- Data residency: US (Supabase region us-east1) with encryption at rest and in transit.
- RBAC for brokerage/admin/agent/transaction_coordinator roles.
- Audit logging for all document edits and signature events.


