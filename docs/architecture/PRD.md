# DealPilot TN - Product Requirements Document (PRD)
## Version 2.0 | February 2026

---

## 1. Executive Summary

DealPilot TN is a Tennessee-native AI Transaction Coordinator platform that replaces human TCs by actually doing the work - not just tracking deadlines and sending reminders. Unlike competitors (e.g., AI TC Wit), DealPilot performs voice-first document selection and completion, line-by-line guided form filling for Tennessee RF forms, conditional document dependency resolution, auto-calculated milestone timelines, compliance auditing, and two-sided deal management.

**Target Users:** KW agents (Kingsport/Tri-Cities), independent brokerages, real estate teams
**Stack:** Supabase (Postgres + Auth + Realtime), Next.js, Vercel, GHL integration
**Differentiator:** Does the TC work vs. reminding you about it

---

## 2. Core Modules

### Module 1: Deal Manager
- Create/manage deals with buyer-side and seller-side views
- Deal lifecycle: Draft > Under Contract > Contingency Period > Clear to Close > Closed
- Deal dashboard with real-time status, next actions, risk indicators
- Link contacts, agents, lenders, title companies, inspectors to each deal

### Module 2: Document Engine
- Tennessee REALTORS form library (RF401, RF623, RF656, addenda)
- Document package builder: auto-select required docs based on deal type
- Document status tracking: Draft > In Progress > Pending Signatures > Executed
- Version control and amendment tracking
- PDF generation from completed form data

### Module 3: Form Filler (Voice/Chat)
- Conversational AI walks agent through form completion
- Voice input with real-time transcription and field mapping
- Section-by-section guided flow with contextual help
- Smart defaults from deal data (pre-fill from contacts, property info)
- Validation at each field with Tennessee-specific rules
- Skip logic for irrelevant sections based on deal conditions

### Module 4: Deadline/Timeline Engine
- Auto-calculate all milestones from binding agreement date
- Deadline rules based on RF401 terms: 3-day loan app, 14-day insurance/intent/appraisal, 5-day cash proof
- Amendment cascade: when dates change, recalculate all dependent deadlines
- Escalation tiers: Info (7d), Warning (48h), Alert (24h), Critical (overdue)
- Task generation: each deadline creates actionable tasks for responsible party
- Calendar sync (Google Calendar, GHL calendar)

### Module 5: Compliance Auditor
- Phase-based document checklist (what docs are required at each deal phase)
- Missing signature/initial detection
- Required disclosures check (lead-based paint, property condition, agency)
- Brokerage policy compliance (broker review requirements)
- Audit trail: every action logged with timestamp, actor, detail
- Pre-closing compliance report generation

### Module 6: Communication Hub
- Automated notifications to agents, clients, vendors
- Template-based messages for common events (inspection scheduled, appraisal ordered, clear to close)
- Multi-channel: email, SMS (via GHL), in-app notifications
- Full message log per deal
- Scheduled reminders with escalation

### Module 7: Two-Sided Deal Model
- Buyer side: buyer agent view with buyer-specific docs, tasks, deadlines
- Seller side: listing agent view with seller-specific docs, tasks, deadlines
- Shared documents: counter-offers, amendments visible to both sides
- Execution order tracking (who signs first, counter deadlines)
- Role-based access: buyer agent sees buyer side, listing agent sees seller side

### Module 8: RF401 Smart Forms
- Complete RF401 Purchase & Sale Agreement digital form
- Line-by-line field definitions with Tennessee REALTORS field references
- Conditional sections: Loan (Section 3A) vs Cash (Section 3B)
- Conveyance items manager (Section A/B/C/D)
- Lease items handler (Section D with fuel tank logic)
- Addendum auto-selector based on deal conditions
- Related forms: RF623 (First Right of Refusal), RF656 (Notification), RF repair forms

---

## 3. Screen Inventory

| Screen | Module | Description |
|--------|--------|-------------|
| Dashboard | Deal Manager | Overview of all active deals, upcoming deadlines, alerts |
| Deal Detail | Deal Manager | Single deal view with tabs: Overview, Documents, Timeline, Messages, Compliance |
| Deal Create/Edit | Deal Manager | Wizard to create new deal with parties, property, terms |
| Contacts | Deal Manager | Contact directory with role assignments |
| Document Library | Document Engine | Browse/search Tennessee form templates |
| Document Package | Document Engine | Auto-generated package for a deal with status tracking |
| Form Filler | Form Filler | Guided form completion interface with voice toggle |
| Form Review | Form Filler | Review completed form before generating PDF |
| Timeline View | Deadline Engine | Visual timeline of all deal milestones with status |
| Deadline Manager | Deadline Engine | List view of all deadlines across deals with filters |
| Compliance Dashboard | Compliance Auditor | Deal compliance status with missing items highlighted |
| Audit Log | Compliance Auditor | Searchable audit trail for a deal |
| Message Center | Communication Hub | All deal communications with templates |
| Settings | System | User profile, notification preferences, integrations |
| GHL Embed | System | Embedded view for GoHighLevel sidebar |

---

## 4. User Flows

### Flow 1: New Deal Creation
1. Agent clicks 'New Deal' from dashboard
2. Select deal type: Buyer Representation or Listing
3. Enter/select buyer and seller contacts
4. Enter property address (auto-lookup county, deed info)
5. Select loan type: Conventional, VA, FHA, USDA, Cash
6. Enter binding agreement date and closing date
7. System auto-generates: deadline schedule, required document package, initial tasks
8. Deal appears on dashboard with first action items

### Flow 2: RF401 Guided Fill
1. From deal detail, click 'Start RF401'
2. AI greets agent, confirms deal parties from deal data
3. Walk through Section 1: Parties (pre-filled from contacts)
4. Section 2: Property (pre-filled from deal, agent confirms county/deed)
5. Section 3: Conveyances - AI asks about each category, agent confirms
6. Section 4: Purchase Price (pre-filled from deal value)
7. Section 5: Financial Contingency - AI detects loan type, shows A or B
8. Section 6: Appraisal Contingency - conditional on loan type
9. Continue through Earnest Money, Inspection, Title, Closing, Possession
10. Addendum check: AI suggests required addenda based on answers
11. Final review: scrollable completed form
12. Generate PDF, attach to deal documents

### Flow 3: Deadline Alert Response
1. System detects 48-hour warning for '14-day Insurance/Intent/Appraisal' deadline
2. Sends notification to buyer agent via email + in-app
3. Agent opens deal, sees highlighted deadline
4. Agent clicks 'Mark Complete' and uploads proof (insurance binder, intent to proceed)
5. System logs completion, advances compliance checklist
6. If not completed by deadline: sends alert to listing agent, logs compliance violation

### Flow 4: Amendment Cascade
1. Parties agree to extend closing date by 14 days
2. Agent enters amendment in deal timeline
3. System recalculates all dependent deadlines (title review, final walkthrough, closing)
4. New deadline notifications generated
5. Amendment logged in audit trail
6. Updated timeline visible to both sides

---

## 5. Tennessee-Specific Requirements

### Forms
- **RF401**: Purchase & Sale Agreement (existing residential, 4 doors or less)
- **RF623**: First Right of Refusal (sale of home contingency)
- **RF656**: Notification form (loan app confirmation, proof of funds, termination notices)
- **Lead-Based Paint Disclosure**: Required for pre-1978 properties
- **Property Condition Disclosure**: TN state requirement
- **Agency Disclosure**: Required at first substantive contact

### Deadlines (from RF401)
- **3 days**: Loan application + credit report (from binding agreement)
- **14 days**: Hazard insurance + intent to proceed + appraisal ordered
- **5 days**: Cash proof of funds (if cash purchase)
- **2 days**: Seller demand compliance period
- **3 days**: Buyer decision after appraisal shortfall notice
- **Custom**: Inspection period, title review, closing date

### Compliance Rules
- Only for Tennessee properties (pre-printed on RF401)
- County registration verification required
- Instrument number from deed required on line 9
- Fuel tank lease assumption requires separate fuel credit calculation
- Conveyance items in Section A are automatic (no negotiation needed)
- Section B items must NOT include personal property
- THDA is not a loan type (attached to VA/FHA)

---

## 6. Integration Points

- **GoHighLevel**: Embedded sidebar app, contact sync, pipeline sync
- **Keller Williams Command**: Contact import, deal sync (V2)
- **Supabase**: Auth, database, realtime subscriptions, storage
- **Calendar**: Google Calendar API for deadline sync
- **PDF Generation**: Server-side PDF from form data
- **E-Signature**: DocuSign/DotLoop integration (V3)
