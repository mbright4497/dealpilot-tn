# Deadline & Timeline Engine

## Inputs
- binding_agreement_date
- loan_type
- contingencies selected (inspection, appraisal, financing)
- buyer/seller negotiated offsets

## Auto-calculated Deadlines (examples)
- Loan application submission: binding_agreement_date + 3 days
- Proof of funds (cash): binding_agreement_date + 5 days
- Inspection period: binding_agreement_date + inspection_period_days (default 10)
- Appraisal ordered: loan_app_submission + 7 days
- Title review: binding_agreement_date + 14 days
- Closing date: as negotiated; engine validates timelines

## Amendment Handling
- When a binding date or closing date changes, recalc dependent deadlines using rule graph and persist previous values as history; mark generated tasks as rescheduled and notify assignees.

## Escalation Rules
- Warning: due_date - 48 hours
- Alert: due_date - 24 hours
- Critical: overdue -> create high-priority task; notify broker

## Task Generation
- Each deadline_rule can map to a task template; when deadline is created, spawn a task assigned to role (agent/TC) with due_date and instructions.

Rule expression example (JSON):
{"name":"loan_app","offset_days":3,"conditions":{"loan_type":{"not":"cash"}}}

