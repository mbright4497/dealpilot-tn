# DIRECTIVE-002: Document State Engine
# Authority: Chief Systems Architect
# Target: OpenClaw Build Agent
# Date: 2026-03-01
# Status: BUILD-READY

---

## 1. OVERVIEW

Upgrade Phase 1 contract extraction to a full Document State Engine.
When a Tennessee RF401 contract PDF is uploaded, the system generates:
- Deal State Object
- Dependency Graph
- Timeline with conditional branching
- Risk Flag list
- Action Queue sorted by urgency

---

## 2. DATABASE SCHEMA UPDATES

Execute in Supabase SQL Editor against `public` schema.

### 2.1 deal_state table

```sql
CREATE TABLE IF NOT EXISTS deal_state (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  state_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','extracted','validated','active','contingent','pending_close','closed','terminated','expired')),
  extracted_data JSONB NOT NULL DEFAULT '{}',
  computed_dates JSONB NOT NULL DEFAULT '{}',
  parties JSONB NOT NULL DEFAULT '{}',
  financial JSONB NOT NULL DEFAULT '{}',
  property JSONB NOT NULL DEFAULT '{}',
  contingencies JSONB NOT NULL DEFAULT '{}',
  special_stipulations JSONB NOT NULL DEFAULT '[]',
  source_document_id TEXT,
  extraction_method TEXT CHECK (extraction_method IN ('openai','regex_fallback','manual')),
  extraction_confidence TEXT CHECK (extraction_confidence IN ('high','medium','low')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transaction_id, state_version)
);
```

### 2.2 dependency_graph table

```sql
CREATE TABLE IF NOT EXISTS dependency_graph (
  id BIGSERIAL PRIMARY KEY,
  deal_state_id BIGINT NOT NULL REFERENCES deal_state(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL
    CHECK (node_type IN ('milestone','contingency','obligation','deadline','approval','document')),
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','satisfied','waived','failed','expired','blocked')),
  depends_on TEXT[] DEFAULT '{}',
  blocks TEXT[] DEFAULT '{}',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  owner_role TEXT,
  auto_fail_on_miss BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_depgraph_deal ON dependency_graph(deal_state_id);
CREATE INDEX idx_depgraph_node ON dependency_graph(node_id);
CREATE INDEX idx_depgraph_status ON dependency_graph(status);
```

### 2.3 deal_timeline_events table

```sql
CREATE TABLE IF NOT EXISTS deal_timeline_events (
  id BIGSERIAL PRIMARY KEY,
  deal_state_id BIGINT NOT NULL REFERENCES deal_state(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('deadline','milestone','contingency_expiry','conditional_branch','document_due','closing_step')),
  label TEXT NOT NULL,
  date DATE NOT NULL,
  date_source TEXT CHECK (date_source IN ('contract_fixed','computed_from_binding','computed_from_closing','manual_override','conditional')),
  computation_rule TEXT,
  branch_condition JSONB,
  branch_true_event TEXT,
  branch_false_event TEXT,
  status TEXT DEFAULT 'upcoming'
    CHECK (status IN ('upcoming','today','overdue','completed','waived','cancelled','branched')),
  priority INT DEFAULT 5,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_timeline_deal ON deal_timeline_events(deal_state_id);
CREATE INDEX idx_timeline_date ON deal_timeline_events(date);
CREATE INDEX idx_timeline_status ON deal_timeline_events(status);
```

### 2.4 risk_flags table

```sql
CREATE TABLE IF NOT EXISTS risk_flags (
  id BIGSERIAL PRIMARY KEY,
  deal_state_id BIGINT NOT NULL REFERENCES deal_state(id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
  category TEXT NOT NULL
    CHECK (category IN ('deadline','financial','contingency','compliance','document','party','title')),
  title TEXT NOT NULL,
  description TEXT,
  trigger_rule TEXT,
  related_node_id TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  auto_generated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_risk_deal ON risk_flags(deal_state_id);
CREATE INDEX idx_risk_severity ON risk_flags(severity);
CREATE INDEX idx_risk_resolved ON risk_flags(is_resolved);
```

### 2.5 action_queue table

```sql
CREATE TABLE IF NOT EXISTS action_queue (
  id BIGSERIAL PRIMARY KEY,
  deal_state_id BIGINT NOT NULL REFERENCES deal_state(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  action_type TEXT NOT NULL
    CHECK (action_type IN ('document_upload','signature','review','approval','notification','scheduling','verification','payment')),
  title TEXT NOT NULL,
  description TEXT,
  assigned_role TEXT,
  urgency INT NOT NULL DEFAULT 5 CHECK (urgency BETWEEN 1 AND 10),
  due_date DATE,
  depends_on_node TEXT,
  blocked_by TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','skipped','blocked','overdue')),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_actionq_deal ON action_queue(deal_state_id);
CREATE INDEX idx_actionq_urgency ON action_queue(urgency DESC);
CREATE INDEX idx_actionq_status ON action_queue(status);
```

### 2.6 RLS Policies

```sql
ALTER TABLE deal_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependency_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON deal_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON dependency_graph FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON deal_timeline_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON risk_flags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON action_queue FOR ALL USING (true) WITH CHECK (true);
```

---

## 3. JSON MODELS

### 3.1 Deal State Object (returned by /api/deal-state/[txId])

```json
{
  "id": 1,
  "transaction_id": 1,
  "state_version": 1,
  "status": "active",
  "parties": {
    "buyers": [{"name": "Rebekah Tolley", "role": "primary_buyer"}],
    "sellers": [{"name": "Cheryl Shelton", "role": "primary_seller"}, {"name": "Timothy Shelton", "role": "co_seller"}],
    "agents": {"buyer_agent": "", "buyer_brokerage": "", "listing_agent": "", "listing_brokerage": ""},
    "title_company": ""
  },
  "property": {
    "address": "212 Mayflower Rd, Johnson City, Tennessee, 37601",
    "county": "Carter",
    "type": "Single Family",
    "legal_description": ""
  },
  "financial": {
    "sale_price": 345000,
    "earnest_money": 0,
    "loan_type": "Conventional",
    "loan_amount": 0,
    "seller_concessions": 0,
    "home_warranty": false
  },
  "computed_dates": {
    "binding_agreement": "2024-01-10",
    "closing": "2024-01-10",
    "possession": null,
    "inspection_deadline": "2024-01-13",
    "inspection_resolution_deadline": null,
    "financing_contingency_deadline": "2024-01-24",
    "appraisal_deadline": null,
    "title_review_deadline": null,
    "final_walkthrough": null
  },
  "contingencies": {
    "inspection": {"active": true, "period_days": 3, "deadline": "2024-01-13", "status": "pending"},
    "financing": {"active": true, "period_days": 14, "deadline": "2024-01-24", "status": "pending"},
    "appraisal": {"active": true, "contingent": true, "deadline": null, "status": "pending"},
    "title": {"active": true, "deadline": null, "status": "pending"},
    "survey": {"active": false},
    "sale_of_property": {"active": false}
  },
  "extraction_method": "openai",
  "extraction_confidence": "high"
}
```

### 3.2 Dependency Graph Nodes (generated per deal)

```json
[
  {"node_id": "CONTRACT_EXECUTED", "node_type": "milestone", "label": "Contract Executed", "depends_on": [], "blocks": ["EARNEST_MONEY","INSPECTION","TITLE_SEARCH","LOAN_APP"], "due_date": "2024-01-10"},
  {"node_id": "EARNEST_MONEY", "node_type": "obligation", "label": "Earnest Money Deposited", "depends_on": ["CONTRACT_EXECUTED"], "blocks": [], "due_date": "2024-01-13", "owner_role": "buyer"},
  {"node_id": "INSPECTION", "node_type": "contingency", "label": "Inspection Period", "depends_on": ["CONTRACT_EXECUTED"], "blocks": ["INSPECTION_RESOLUTION"], "due_date": "2024-01-13", "auto_fail_on_miss": true, "owner_role": "buyer"},
  {"node_id": "INSPECTION_RESOLUTION", "node_type": "contingency", "label": "Inspection Resolution", "depends_on": ["INSPECTION"], "blocks": ["REPAIR_COMPLETION"], "due_date": null, "owner_role": "both"},
  {"node_id": "REPAIR_COMPLETION", "node_type": "obligation", "label": "Repairs Completed", "depends_on": ["INSPECTION_RESOLUTION"], "blocks": ["FINAL_WALKTHROUGH"], "owner_role": "seller"},
  {"node_id": "LOAN_APP", "node_type": "obligation", "label": "Loan Application", "depends_on": ["CONTRACT_EXECUTED"], "blocks": ["FINANCING_CONTINGENCY"], "owner_role": "buyer"},
  {"node_id": "FINANCING_CONTINGENCY", "node_type": "contingency", "label": "Financing Contingency", "depends_on": ["LOAN_APP"], "blocks": ["CLEAR_TO_CLOSE"], "due_date": "2024-01-24", "auto_fail_on_miss": true},
  {"node_id": "APPRAISAL", "node_type": "contingency", "label": "Appraisal", "depends_on": ["LOAN_APP"], "blocks": ["CLEAR_TO_CLOSE"], "owner_role": "lender"},
  {"node_id": "TITLE_SEARCH", "node_type": "obligation", "label": "Title Search & Exam", "depends_on": ["CONTRACT_EXECUTED"], "blocks": ["TITLE_CLEAR"], "owner_role": "title_company"},
  {"node_id": "TITLE_CLEAR", "node_type": "approval", "label": "Title Clear", "depends_on": ["TITLE_SEARCH"], "blocks": ["CLEAR_TO_CLOSE"]},
  {"node_id": "CLEAR_TO_CLOSE", "node_type": "milestone", "label": "Clear to Close", "depends_on": ["FINANCING_CONTINGENCY","APPRAISAL","TITLE_CLEAR"], "blocks": ["FINAL_WALKTHROUGH","CLOSING"]},
  {"node_id": "FINAL_WALKTHROUGH", "node_type": "milestone", "label": "Final Walkthrough", "depends_on": ["CLEAR_TO_CLOSE","REPAIR_COMPLETION"], "blocks": ["CLOSING"], "owner_role": "buyer"},
  {"node_id": "CLOSING", "node_type": "milestone", "label": "Closing", "depends_on": ["FINAL_WALKTHROUGH"], "blocks": ["POSSESSION"], "due_date": "2024-01-10"},
  {"node_id": "POSSESSION", "node_type": "milestone", "label": "Possession Transfer", "depends_on": ["CLOSING"], "blocks": []}
]
```

---

## 4. STATE TRANSITIONS

```
draft -> extracted        : On PDF upload + AI extraction complete
extracted -> validated    : On user review + confirm
validated -> active       : On binding agreement date reached
active -> contingent      : On any contingency deadline approaching (< 3 days)
contingent -> active      : On contingency satisfied/waived
active -> pending_close   : On all contingencies satisfied + clear to close
pending_close -> closed   : On closing date + all docs signed
active -> terminated      : On contingency failure OR mutual termination
active -> expired         : On closing date passed without close
```

Transition triggers stored in `deal_state.status`. Each transition:
1. Updates `deal_state.status` and `updated_at`
2. Increments `state_version`
3. Inserts audit row in `activity_log`
4. Recalculates `risk_flags`
5. Reorders `action_queue`

---

## 5. CONDITIONAL LOGIC: INSPECTION, FINANCING, APPRAISAL

### 5.1 Inspection Branch

```
IF inspection_period_days > 0:
  CREATE node INSPECTION with deadline = binding + inspection_period_days
  IF inspection completed AND issues found:
    CREATE node INSPECTION_RESOLUTION
    BRANCH:
      IF buyer requests repairs -> REPAIR_COMPLETION node
      IF buyer accepts as-is -> mark INSPECTION_RESOLUTION satisfied
      IF buyer terminates -> deal_state.status = 'terminated'
  IF inspection period expires with no action:
    auto_fail_on_miss = true -> buyer forfeits inspection rights
    mark INSPECTION as 'expired', deal continues
```

### 5.2 Financing Branch

```
IF loan_type != 'Cash':
  CREATE node FINANCING_CONTINGENCY with deadline = binding + financing_contingency_days
  BRANCH:
    IF loan approved -> mark satisfied, unblock CLEAR_TO_CLOSE
    IF loan denied within period -> buyer may terminate, earnest money returned
    IF financing_contingency_days expires:
      auto_fail_on_miss = true -> buyer waives financing contingency
      RISK_FLAG: severity='critical', title='Financing contingency expired'
IF loan_type == 'Cash':
  SKIP financing nodes
  Mark FINANCING_CONTINGENCY as 'waived'
```

### 5.3 Appraisal Branch

```
IF appraisal_contingent == true:
  CREATE node APPRAISAL dependent on LOAN_APP
  BRANCH:
    IF appraised >= sale_price -> satisfied
    IF appraised < sale_price:
      RISK_FLAG: severity='high', title='Appraisal gap'
      SUB-BRANCH:
        IF seller reduces price -> update financial.sale_price, satisfied
        IF buyer covers gap -> satisfied, add action 'Buyer gap coverage verification'
        IF no agreement -> deal_state.status = 'terminated'
IF appraisal_contingent == false:
  Mark APPRAISAL as 'waived'
```

---

## 6. API ENDPOINTS

All routes under `dealpilot-tn/web/src/app/api/`

### 6.1 POST /api/deal-state/generate

Trigger: Called after contract PDF upload + extraction.
Input: `{ transaction_id: number, extracted_data: object }`
Process:
1. Create `deal_state` row with extracted_data parsed into parties, property, financial, contingencies
2. Compute all dates from binding_agreement_date + period_days
3. Generate dependency_graph nodes based on contingency flags
4. Generate deal_timeline_events from computed_dates
5. Run risk_flag evaluation
6. Generate action_queue sorted by urgency
Output: `{ deal_state_id, status, node_count, timeline_count, risk_count, action_count }`

### 6.2 GET /api/deal-state/[txId]

Returns full Deal State Object (Section 3.1 JSON) for a transaction.
Joins: deal_state + dependency_graph + deal_timeline_events + risk_flags + action_queue
Headers: `Cache-Control: no-store`

### 6.3 GET /api/deal-state/[txId]/graph

Returns dependency_graph nodes for the transaction's current deal_state.
Output: Array of nodes (Section 3.2 JSON)

### 6.4 GET /api/deal-state/[txId]/timeline

Returns deal_timeline_events ordered by date.
Output: `{ events: [...], branches: [...] }`

### 6.5 GET /api/deal-state/[txId]/risks

Returns risk_flags ordered by severity DESC.
Output: `{ flags: [...], critical_count, high_count, unresolved_count }`

### 6.6 GET /api/deal-state/[txId]/actions

Returns action_queue ordered by urgency DESC, due_date ASC.
Output: `{ actions: [...], overdue_count, pending_count }`

### 6.7 PATCH /api/deal-state/[txId]/node/[nodeId]

Update a dependency graph node status.
Input: `{ status: 'satisfied'|'waived'|'failed', metadata?: object }`
Process:
1. Update node status
2. Cascade: check if blocked nodes are now unblocked
3. Recalculate risk_flags
4. Update action_queue
5. Check for state transitions
Output: `{ updated_node, cascaded_updates: [...], new_risks: [...] }`

### 6.8 POST /api/deal-state/[txId]/event

Event-driven update when new documents uploaded.
Input: `{ event_type: string, document_type: string, metadata: object }`
Process: See Section 7.

---

## 7. EVENT-DRIVEN UPDATES

When a new document is uploaded to a deal:

```
ON document_upload(deal_id, doc_type):

  SWITCH doc_type:

    'inspection_report':
      -> Mark INSPECTION node as 'satisfied'
      -> If issues found in report metadata:
         Create INSPECTION_RESOLUTION node
         Create risk_flag if critical issues
         Add action: 'Review inspection report and respond'
      -> Recalculate timeline

    'repair_request':
      -> Mark INSPECTION_RESOLUTION as 'in_progress'
      -> Create REPAIR_COMPLETION node with deadline
      -> Add action: 'Seller to complete repairs' urgency=8

    'repair_completion_cert':
      -> Mark REPAIR_COMPLETION as 'satisfied'
      -> Unblock FINAL_WALKTHROUGH
      -> Add action: 'Schedule final walkthrough' urgency=7

    'loan_approval':
      -> Mark FINANCING_CONTINGENCY as 'satisfied'
      -> Remove financing risk_flags
      -> Unblock CLEAR_TO_CLOSE (if other deps met)

    'loan_denial':
      -> Mark FINANCING_CONTINGENCY as 'failed'
      -> Create risk_flag severity='critical'
      -> Add action: 'Buyer to decide: terminate or find alternative financing' urgency=10

    'appraisal_report':
      -> Parse appraised_value from metadata
      -> IF appraised_value >= sale_price:
           Mark APPRAISAL as 'satisfied'
      -> ELSE:
           Create risk_flag 'Appraisal gap: $X'
           Add action: 'Negotiate appraisal gap resolution' urgency=9

    'title_commitment':
      -> Mark TITLE_SEARCH as 'satisfied'
      -> If exceptions found:
           Create risk_flag for each exception
           Add action: 'Review title exceptions' urgency=7
      -> Else:
           Mark TITLE_CLEAR as 'satisfied'

    'closing_disclosure':
      -> Add action: 'Review closing disclosure - 3 day review period' urgency=8
      -> Update timeline with CD review deadline

    'amendment':
      -> Parse amendment fields
      -> Update deal_state extracted_data
      -> Recompute affected dates
      -> Regenerate affected dependency nodes
      -> Recalculate risk_flags
      -> Increment state_version

  AFTER all updates:
    -> Recalculate action_queue urgency scores
    -> Check for state transitions
    -> Insert activity_log entry
```

---

## 8. RISK FLAG GENERATION RULES

```
RULE deadline_approaching:
  FOR EACH node WHERE due_date IS NOT NULL AND status = 'pending':
    IF due_date - today <= 1 day: severity = 'critical'
    IF due_date - today <= 3 days: severity = 'high'
    IF due_date - today <= 7 days: severity = 'medium'

RULE earnest_money_missing:
  IF EARNEST_MONEY node status = 'pending' AND days_since_binding > 3:
    severity = 'high', title = 'Earnest money not deposited'

RULE financing_not_started:
  IF LOAN_APP node status = 'pending' AND days_since_binding > 5:
    severity = 'medium', title = 'Loan application not submitted'

RULE closing_date_conflict:
  IF any blocking node has due_date > closing_date:
    severity = 'critical', title = 'Dependency deadline exceeds closing date'

RULE missing_contacts:
  IF deal has no title_company contact:
    severity = 'medium', title = 'Title company not assigned'
  IF deal has no lender contact AND loan_type != 'Cash':
    severity = 'medium', title = 'Lender not assigned'

RULE stale_deal:
  IF no activity_log entries for deal in 7 days AND status = 'active':
    severity = 'low', title = 'No activity in 7 days'
```

---

## 9. BUILD ORDER

```
STEP 1: Execute SQL (Section 2) in Supabase
STEP 2: Create /api/deal-state/generate/route.ts
STEP 3: Create /api/deal-state/[txId]/route.ts (GET)
STEP 4: Create /api/deal-state/[txId]/graph/route.ts
STEP 5: Create /api/deal-state/[txId]/timeline/route.ts
STEP 6: Create /api/deal-state/[txId]/risks/route.ts
STEP 7: Create /api/deal-state/[txId]/actions/route.ts
STEP 8: Create /api/deal-state/[txId]/node/[nodeId]/route.ts (PATCH)
STEP 9: Create /api/deal-state/[txId]/event/route.ts (POST)
STEP 10: Modify /api/ai/extract-contract/route.ts to call /api/deal-state/generate after extraction
STEP 11: Create lib/deal-state-engine.ts (shared computation logic)
STEP 12: Create lib/risk-evaluator.ts
STEP 13: Create lib/dependency-resolver.ts
```

---

END DIRECTIVE-002
