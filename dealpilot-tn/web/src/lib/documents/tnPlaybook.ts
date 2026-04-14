/**
 * Vera's Tennessee Transaction Playbook
 * Maps every RF708 timeline checkpoint to: when it fires, who to contact,
 * what to say, and what documents should exist.
 *
 * This is NOT a database table — it's code Vera reads at runtime.
 * The morning cron evaluates every play against every active deal.
 *
 * Key dates derived from the transaction:
 *   BAD = Binding Agreement Date (transactions.binding_agreement_date)
 *   CD  = Closing Date (transactions.closing_date)
 *   IPE = Inspection Period End (BAD + inspection_period_days)
 *   RPE = Resolution Period End (IPE + resolution_period_days)
 *
 * Cross-references: `tnDocumentChecklist.ts` (slot IDs), `document-registry.ts`, `document-types.ts`.
 */

export type PlayPhase =
  | 'contract_executed' // Day 0 — deal goes live
  | 'earnest_money' // BAD + earnest money days
  | 'loan_application' // BAD + 3 days
  | 'due_diligence' // BAD + 14 days
  | 'inspection' // Within inspection period
  | 'inspection_response' // End of inspection period
  | 'resolution' // Resolution period (if repairs requested)
  | 'appraisal' // Appraisal process
  | 'financing' // Loan progress
  | 'pre_closing' // CD - 14 to CD - 7
  | 'closing_week' // CD - 7 to CD
  | 'closing_day' // CD
  | 'post_closing' // After closing

export type TriggerType =
  | 'bad_plus_days' // X days after Binding Agreement Date
  | 'closing_minus_days' // X days before Closing Date
  | 'ipe_minus_days' // X days before Inspection Period End
  | 'state_entry' // When deal enters a phase
  | 'event' // When something specific happens
  | 'deadline_passed' // When a deadline has passed without action

export type ContactRole =
  | 'agent' // The listing/buying agent (transaction owner)
  | 'buyer' // Buyer(s)
  | 'seller' // Seller(s)
  | 'lender' // Loan officer / mortgage company
  | 'title' // Title company / closing attorney
  | 'inspector' // Home inspector
  | 'appraiser' // Appraiser
  | 'insurance' // Hazard insurance agent
  | 'hoa' // HOA / property management
  | 'termite' // WDI / pest inspector
  | 'surveyor' // Survey company

export type ActionType =
  | 'confirm' // "Can you confirm X has been done?"
  | 'remind' // "Reminder: X is due by Y"
  | 'request_doc' // "Please provide document X"
  | 'inform' // "FYI: here's the status"
  | 'check_weather' // "Weather check for outdoor scheduling"
  | 'escalate' // "This is overdue — agent needs to know"
  | 'recommend' // "Best practice: consider doing X"

export type Channel = 'email' | 'sms' | 'agent_only'
// 'email' = Vera emails the contact directly
// 'sms' = Vera texts the contact directly
// 'agent_only' = Vera only notifies the agent (no direct contact)

export interface PlayCondition {
  field: string // transaction field to check
  operator:
    | 'eq'
    | 'neq'
    | 'exists'
    | 'not_exists'
    | 'in'
    | 'gt'
    | 'lt'
    | 'true'
    | 'false'
  value?: string | number | boolean | string[]
}

export interface PlaybookPlay {
  id: string
  phase: PlayPhase
  name: string
  description: string // Plain English — what this play does and why

  // RF references
  rf708_line?: number // Line on the RF708 checklist
  rf401_section?: string // Section of the RF401 contract

  // TRIGGER — when does this play fire?
  trigger: {
    type: TriggerType
    days?: number // For bad_plus_days, closing_minus_days, ipe_minus_days
    event?: string // For event type: 'doc_uploaded', 'contact_added', etc.
  }

  // CONDITIONS — does this play apply to this deal?
  // All conditions must be true (AND logic). null = always applies.
  conditions: PlayCondition[] | null

  // ACTION — what Vera does
  contact_role: ContactRole
  channel: Channel
  action_type: ActionType

  // MESSAGE — what Vera says. Use {{placeholders}} for deal data:
  // {{property_address}}, {{buyer_names}}, {{seller_names}}, {{closing_date}},
  // {{agent_name}}, {{contact_name}}, {{deadline_date}}, {{days_remaining}},
  // {{inspection_end_date}}, {{binding_date}}, {{purchase_price}}
  vera_message: string

  // DOCUMENT — related form from the checklist
  related_doc_id?: string // Matches TNDocumentSlot.id from tnDocumentChecklist.ts
  related_rf_form?: string // e.g. 'RF625', 'RF709'

  // ESCALATION — what if nobody responds?
  escalation_days?: number // Days to wait before escalating to agent
  escalation_message?: string // What to tell the agent if no response

  // WEATHER — should Vera check forecast before this play?
  check_weather: boolean // true for outdoor activities (inspection, survey, photos)

  // PRIORITY — 1 = critical (earnest money, closing), 10 = nice to have
  priority: number

  // VERA'S BOUNDARIES
  vera_can_act: boolean // true = Vera contacts directly; false = agent_only
  vera_can_schedule: false // ALWAYS false — Vera never schedules, vendors decide
}

// ═══════════════════════════════════════════════════════════════════
// THE PLAYBOOK
// ═══════════════════════════════════════════════════════════════════

export const TN_PLAYBOOK: PlaybookPlay[] = [
  // ─── CONTRACT EXECUTED (Day 0) ─────────────────────────────────

  {
    id: 'contract_intro_all_parties',
    phase: 'contract_executed',
    name: 'Introduce Vera to all parties',
    description:
      'When a deal goes live, Vera introduces herself to every contact on the transaction. Sets expectations that she will be coordinating communications.',
    trigger: { type: 'state_entry', event: 'deal_created' },
    conditions: null,
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'inform',
    vera_message:
      "New transaction is live for {{property_address}}. I'll begin coordinating with all parties. Closing is set for {{closing_date}} — {{days_remaining}} days from today. I'll track every deadline from here.",
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'contract_confirm_title',
    phase: 'contract_executed',
    name: 'Confirm contract received by title company',
    description:
      'Verify the title/closing company has received the executed contract and has opened the file.',
    rf708_line: 8,
    rf401_section: '2.D',
    trigger: { type: 'bad_plus_days', days: 1 },
    conditions: [{ field: 'contacts', operator: 'exists', value: 'title' }],
    contact_role: 'title',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      "Hi {{contact_name}}, this is Vera, transaction coordinator for {{agent_name}}. We have a new contract on {{property_address}} with a closing date of {{closing_date}}. Can you confirm you've received the executed agreement and opened the file? Please let me know if you need anything from our side.",
    escalation_days: 2,
    escalation_message:
      'Title company has not confirmed receipt of the contract for {{property_address}}. You may want to follow up directly.',
    priority: 2,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'contract_confirm_lender',
    phase: 'contract_executed',
    name: 'Confirm contract received by lender',
    description: 'Verify the lender has received the executed contract.',
    rf401_section: '2.D',
    trigger: { type: 'bad_plus_days', days: 1 },
    conditions: [
      { field: 'contacts', operator: 'exists', value: 'lender' },
      { field: 'financing_contingency_waived', operator: 'false' },
    ],
    contact_role: 'lender',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      "Hi {{contact_name}}, this is Vera, transaction coordinator for {{agent_name}}. We have an executed purchase agreement on {{property_address}} for {{buyer_names}}. Closing is scheduled for {{closing_date}}. Can you confirm you have the contract and the loan application process is underway?",
    escalation_days: 2,
    escalation_message:
      'Lender has not confirmed receipt of the contract for {{property_address}}. Loan application deadline is BAD + 3 days.',
    priority: 2,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  // ─── EARNEST MONEY (BAD + EM days) ─────────────────────────────

  {
    id: 'earnest_money_due_reminder',
    phase: 'earnest_money',
    name: 'Earnest money due reminder',
    description:
      'Remind agent that earnest money delivery deadline is approaching. Per RF401 Section 3, buyer must deliver within the agreed number of days after BAD.',
    rf708_line: 14,
    rf401_section: '3',
    trigger: { type: 'bad_plus_days', days: 1 },
    conditions: null,
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'remind',
    vera_message:
      'Earnest money for {{property_address}} is due within {{earnest_money_days}} days of the Binding Agreement Date. Please confirm with the holder that it has been received or is en route.',
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'earnest_money_confirm_holder',
    phase: 'earnest_money',
    name: 'Confirm earnest money received by holder',
    description:
      'Check with the earnest money holder that funds have been received. Per RF401 Section 3, must be deposited promptly after BAD.',
    rf708_line: 14,
    rf401_section: '3',
    trigger: { type: 'bad_plus_days', days: 3 },
    conditions: [{ field: 'contacts', operator: 'exists', value: 'title' }],
    contact_role: 'title',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      'Hi {{contact_name}}, this is Vera coordinating the transaction at {{property_address}}. Can you confirm that the earnest money deposit of {{earnest_money}} has been received? Per the contract, it was due within {{earnest_money_days}} days of the Binding Agreement Date ({{binding_date}}). Thank you.',
    escalation_days: 1,
    escalation_message:
      'Earnest money holder has not confirmed receipt for {{property_address}}. This is time-sensitive — buyer could be in default per Section 3.A if funds are not received.',
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'earnest_money_deposited',
    phase: 'earnest_money',
    name: 'Confirm earnest money deposited',
    description:
      'Verify earnest money has been deposited into escrow. RF401 Section 3.B requires prompt deposit. Cannot disburse for 14 days unless bank clearance.',
    rf708_line: 15,
    rf401_section: '3.B',
    trigger: { type: 'bad_plus_days', days: 5 },
    conditions: [{ field: 'contacts', operator: 'exists', value: 'title' }],
    contact_role: 'title',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      'Hi {{contact_name}}, following up on {{property_address}} — has the earnest money deposit of {{earnest_money}} been deposited into the escrow account? Please confirm at your convenience.',
    escalation_days: 2,
    escalation_message:
      'Still no confirmation that earnest money was deposited for {{property_address}}. This could become an issue at closing.',
    priority: 2,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  // ─── LOAN APPLICATION (BAD + 3) ─────────────────────────────────

  {
    id: 'loan_app_verify',
    phase: 'loan_application',
    name: 'Verify loan application submitted',
    description:
      'Per RF401 Section 2.A.(1), buyer must apply for loan and pay for credit report within 3 days of BAD. Buyer must notify seller of lender name and contact info.',
    rf708_line: 21,
    rf401_section: '2.A.(1)',
    trigger: { type: 'bad_plus_days', days: 3 },
    conditions: [{ field: 'financing_contingency_waived', operator: 'false' }],
    contact_role: 'lender',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      'Hi {{contact_name}}, this is Vera coordinating the purchase at {{property_address}} for {{buyer_names}}. Per the contract, the loan application was due within 3 days of the Binding Agreement Date ({{binding_date}}). Can you confirm the application has been submitted and the credit report has been ordered? Thank you.',
    escalation_days: 1,
    escalation_message:
      'Lender has not confirmed loan application for {{property_address}}. Per Section 2.A.(1), buyer was required to apply within 3 days of BAD. Seller may issue a Written Demand for Compliance.',
    related_doc_id: 'notification',
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'loan_app_notify_seller',
    phase: 'loan_application',
    name: 'Notify seller of loan application',
    description:
      'Per RF401 Section 2.A.(1), buyer must notify seller of lender name/contact and that credit report was ordered. Via Notification form or equivalent.',
    rf708_line: 23,
    rf401_section: '2.A.(1)',
    trigger: { type: 'bad_plus_days', days: 3 },
    conditions: [{ field: 'financing_contingency_waived', operator: 'false' }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'remind',
    vera_message:
      "Per the contract, buyer is required to notify the seller that the loan application has been made, provide the lender's name and contact info, and confirm the credit report was ordered. This was due by {{deadline_date}}. Has this notification been sent? If not, consider using RF656 Notification form.",
    related_doc_id: 'notification',
    related_rf_form: 'RF656',
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  // ─── DUE DILIGENCE (BAD + 14) ──────────────────────────────────

  {
    id: 'appraisal_ordered',
    phase: 'due_diligence',
    name: 'Confirm appraisal ordered',
    description:
      'Per RF401 Section 2.A.(2)(c), buyer must request appraisal be ordered and affirm fee paid within 14 days of BAD.',
    rf708_line: 25,
    rf401_section: '2.A.(2)(c)',
    trigger: { type: 'bad_plus_days', days: 14 },
    conditions: [{ field: 'financing_contingency_waived', operator: 'false' }],
    contact_role: 'lender',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      'Hi {{contact_name}}, checking in on the appraisal for {{property_address}}. Per the contract, the buyer was to request the appraisal be ordered and confirm the fee has been paid by {{deadline_date}}. Can you confirm the appraisal has been ordered? Thank you.',
    escalation_days: 2,
    escalation_message:
      'Lender has not confirmed appraisal was ordered for {{property_address}}. This was due by BAD + 14 days per Section 2.A.(2)(c). Seller may issue Written Demand for Compliance.',
    priority: 2,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'hazard_insurance_secured',
    phase: 'due_diligence',
    name: 'Confirm hazard insurance evidence',
    description:
      'Per RF401 Section 2.A.(2)(a), buyer must secure evidence of hazard insurance within 14 days of BAD and notify seller of insurance company name.',
    rf708_line: 26,
    rf401_section: '2.A.(2)(a)',
    trigger: { type: 'bad_plus_days', days: 14 },
    conditions: [{ field: 'financing_contingency_waived', operator: 'false' }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'remind',
    vera_message:
      'Per Section 2.A.(2)(a), buyer was required to secure evidence of hazard insurance by {{deadline_date}} and notify seller of the insurance company name. Has this been done? Also confirm buyer has notified lender of Intent to Proceed and has available funds per the Loan Estimate (Section 2.A.(2)(b)).',
    priority: 2,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'intent_to_proceed',
    phase: 'due_diligence',
    name: 'Confirm Intent to Proceed with lender',
    description:
      'Per RF401 Section 2.A.(2)(b), buyer must notify lender of Intent to Proceed and have available funds per signed Loan Estimate within 14 days of BAD.',
    rf708_line: 26,
    rf401_section: '2.A.(2)(b)',
    trigger: { type: 'bad_plus_days', days: 14 },
    conditions: [{ field: 'financing_contingency_waived', operator: 'false' }],
    contact_role: 'lender',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      'Hi {{contact_name}}, per the contract for {{property_address}}, the buyer was to notify you of an Intent to Proceed and confirm available funds per the Loan Estimate by {{deadline_date}}. Can you confirm both have been received? Thank you.',
    escalation_days: 2,
    escalation_message:
      'Lender has not confirmed Intent to Proceed for {{property_address}}. Due by BAD + 14 per Section 2.A.(2)(b).',
    priority: 2,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  // ─── FINANCING CONTINGENCY WAIVED TRACK ─────────────────────────

  {
    id: 'proof_of_funds',
    phase: 'loan_application',
    name: 'Proof of funds due (financing waived)',
    description:
      'Per RF401 Section 2.B, when financing contingency is waived, buyer must provide proof of funds within 5 days of BAD.',
    rf708_line: 34,
    rf401_section: '2.B',
    trigger: { type: 'bad_plus_days', days: 5 },
    conditions: [{ field: 'financing_contingency_waived', operator: 'true' }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'remind',
    vera_message:
      'Financing contingency was waived on {{property_address}}. Per Section 2.B, buyer must provide proof of available funds (bank statement or lender commitment letter) by {{deadline_date}}. Has this been provided to the seller? If not, seller may issue a Written Demand for Compliance.',
    related_rf_form: 'RF656',
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  // ─── APPRAISAL ─────────────────────────────────────────────────

  {
    id: 'appraisal_complete_check',
    phase: 'appraisal',
    name: 'Check appraisal completion',
    description:
      'Follow up with lender to confirm appraisal has been completed. Critical path item — affects financing and contingency deadlines.',
    rf708_line: 45,
    trigger: { type: 'bad_plus_days', days: 21 },
    conditions: [
      { field: 'financing_contingency_waived', operator: 'false' },
      { field: 'appraisal_contingent', operator: 'true' },
    ],
    contact_role: 'lender',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      'Hi {{contact_name}}, checking on the appraisal status for {{property_address}}. Has the appraisal been completed? If so, did the appraised value meet or exceed the purchase price of {{purchase_price}}? Please let us know so we can keep everything on track for our {{closing_date}} closing.',
    escalation_days: 3,
    escalation_message:
      'Appraisal status unknown for {{property_address}}. This is a critical path item — if appraisal comes in low, buyer has 3 days to decide (waive contingency or terminate per Section 2.C.2).',
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'appraisal_low_alert',
    phase: 'appraisal',
    name: 'Low appraisal alert to agent',
    description:
      'If appraisal comes in below purchase price and deal is contingent, buyer has 3 days to waive or terminate per RF401 Section 2.C.2. Critical deadline.',
    rf708_line: 47,
    rf401_section: '2.C.2',
    trigger: { type: 'event', event: 'appraisal_low' },
    conditions: [{ field: 'appraisal_contingent', operator: 'true' }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'escalate',
    vera_message:
      'URGENT: The appraisal for {{property_address}} came in below the purchase price of {{purchase_price}}. Per Section 2.C.2, the buyer has 3 DAYS to either (1) waive the appraisal contingency via RF656 Notification, or (2) terminate the agreement. If buyer does neither, the contingency is deemed satisfied. This deadline is {{deadline_date}}. What would you like to do?',
    related_rf_form: 'RF656',
    priority: 1,
    check_weather: false,
    vera_can_act: false,
    vera_can_schedule: false,
  },

  // ─── INSPECTION ────────────────────────────────────────────────

  {
    id: 'inspection_schedule_reminder',
    phase: 'inspection',
    name: 'Remind agent to schedule inspection',
    description:
      'Early in the inspection period, remind agent to get the home inspection scheduled. Check weather for outdoor conditions.',
    rf708_line: 51,
    rf401_section: '8.D',
    trigger: { type: 'bad_plus_days', days: 1 },
    conditions: [{ field: 'inspection_waived', operator: 'false' }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'remind',
    vera_message:
      "The inspection period for {{property_address}} runs through {{inspection_end_date}} ({{days_remaining}} days). Have you scheduled the home inspection? I'd recommend getting it done early to leave time for the resolution period if needed.",
    check_weather: true,
    priority: 2,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'inspection_contact_inspector',
    phase: 'inspection',
    name: 'Reach out to inspector for scheduling',
    description:
      'If inspector contact is on the deal, Vera reaches out to confirm availability and coordinate scheduling. Does NOT schedule — just confirms availability and relays to agent.',
    rf708_line: 52,
    rf401_section: '8.B',
    trigger: { type: 'bad_plus_days', days: 2 },
    conditions: [
      { field: 'inspection_waived', operator: 'false' },
      { field: 'contacts', operator: 'exists', value: 'inspector' },
    ],
    contact_role: 'inspector',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      "Hi {{contact_name}}, this is Vera, transaction coordinator for {{agent_name}}. We have a home inspection needed at {{property_address}}. The inspection period ends {{inspection_end_date}}. {{agent_name}} will coordinate the schedule directly with you — just wanted to introduce myself and confirm you're available for this property. Please let us know your availability and we'll get it set up.",
    check_weather: true,
    escalation_days: 1,
    escalation_message:
      'Inspector ({{contact_name}}) has not responded about availability for {{property_address}}. Inspection period ends {{inspection_end_date}}.',
    priority: 2,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'wdi_schedule',
    phase: 'inspection',
    name: 'Wood Destroying Insect inspection reminder',
    description:
      "Per RF401 Section 8.C, WDI inspection is buyer's responsibility. Remind agent to schedule with licensed pest control operator.",
    rf708_line: 56,
    rf401_section: '8.C',
    trigger: { type: 'bad_plus_days', days: 3 },
    conditions: [{ field: 'inspection_waived', operator: 'false' }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'remind',
    vera_message:
      "Don't forget the Wood Destroying Insect (termite) inspection for {{property_address}}. Per Section 8.C, this must be done by a Tennessee licensed pest control operator. The WDI report should be completed within the inspection period (ends {{inspection_end_date}}). Has this been scheduled?",
    related_rf_form: 'termite_letter',
    check_weather: true,
    priority: 3,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'inspection_period_warning',
    phase: 'inspection',
    name: 'Inspection period ending warning',
    description:
      'Alert agent that the inspection period is about to end. Buyer must respond: terminate, accept as-is, or request repairs.',
    rf708_line: 68,
    rf401_section: '8.D',
    trigger: { type: 'ipe_minus_days', days: 2 },
    conditions: [{ field: 'inspection_waived', operator: 'false' }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'escalate',
    vera_message:
      "HEADS UP: The inspection period for {{property_address}} ends in 2 days ({{inspection_end_date}}). Buyer MUST respond before then with one of three options:\n\n1. Terminate with written objections (RF656 Notification) — earnest money returned\n2. Accept property AS IS (RF656 Notification)\n3. Submit repair/replacement request (RF654 Repair Proposal)\n\nIf buyer fails to respond by the deadline, they forfeit all inspection rights and accept the property as-is. What's the plan?",
    related_rf_form: 'RF656',
    priority: 1,
    check_weather: false,
    vera_can_act: false,
    vera_can_schedule: false,
  },

  {
    id: 'inspection_period_expired',
    phase: 'inspection_response',
    name: 'Inspection period expired — no response',
    description:
      'If the inspection period ended without buyer response, buyer has forfeited inspection rights per RF401 Section 8.D. Alert agent immediately.',
    rf708_line: 68,
    rf401_section: '8.D',
    trigger: { type: 'deadline_passed', event: 'inspection_period_end' },
    conditions: [{ field: 'inspection_waived', operator: 'false' }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'escalate',
    vera_message:
      'IMPORTANT: The inspection period for {{property_address}} has expired as of {{inspection_end_date}}. If buyer did not submit a written response (terminate, accept, or request repairs), buyer has forfeited all rights under Section 8 and has accepted the property as-is per the contract.',
    priority: 1,
    check_weather: false,
    vera_can_act: false,
    vera_can_schedule: false,
  },

  // ─── RESOLUTION PERIOD ─────────────────────────────────────────

  {
    id: 'resolution_period_started',
    phase: 'resolution',
    name: 'Resolution period started',
    description:
      'Buyer submitted a repair request. Resolution period clock starts. Both parties must negotiate in good faith per RF401 Section 8.D.(3).',
    rf708_line: 69,
    rf401_section: '8.D.(3)',
    trigger: { type: 'event', event: 'repair_request_submitted' },
    conditions: null,
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'inform',
    vera_message:
      "Buyer has submitted a repair/replacement request for {{property_address}}. The Resolution Period is {{resolution_period_days}} days. During this time, both parties must negotiate in good faith. The agreement will terminate at the end of the Resolution Period with a refund of earnest money UNLESS:\n\n1. A Repair/Replacement Amendment (RF655) is signed\n2. Buyer accepts property AS IS\n3. Both parties agree to extend the Resolution Period\n\nResolution Period ends: {{deadline_date}}",
    related_rf_form: 'RF655',
    priority: 1,
    check_weather: false,
    vera_can_act: false,
    vera_can_schedule: false,
  },

  {
    id: 'resolution_period_warning',
    phase: 'resolution',
    name: 'Resolution period ending warning',
    description:
      'Resolution period is about to expire. If no agreement is reached, the deal terminates automatically per RF401 Section 8.D.(3).',
    rf708_line: 69,
    rf401_section: '8.D.(3)',
    trigger: { type: 'event', event: 'resolution_period_day_before' },
    conditions: null,
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'escalate',
    vera_message:
      'URGENT: The Resolution Period for {{property_address}} ends TOMORROW ({{deadline_date}}). If no Repair/Replacement Amendment (RF655) is signed, buyer does not accept AS IS, or no extension is agreed to, this agreement TERMINATES AUTOMATICALLY and earnest money is returned to the buyer. What is the status of negotiations?',
    related_rf_form: 'RF655',
    priority: 1,
    check_weather: false,
    vera_can_act: false,
    vera_can_schedule: false,
  },

  // ─── PRE-CLOSING (CD - 14 to CD - 7) ──────────────────────────

  {
    id: 'title_commitment_check',
    phase: 'pre_closing',
    name: 'Check title commitment status',
    description:
      'Verify title search and commitment are complete. Title company should have cleared any issues.',
    trigger: { type: 'closing_minus_days', days: 14 },
    conditions: [{ field: 'contacts', operator: 'exists', value: 'title' }],
    contact_role: 'title',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      'Hi {{contact_name}}, checking in on the title work for {{property_address}} with closing scheduled for {{closing_date}}. Has the title search been completed? Any exceptions or issues we should be aware of? Please let us know if there are any items that need to be resolved before closing.',
    escalation_days: 3,
    escalation_message:
      'Title company has not confirmed title commitment status for {{property_address}}. Closing is {{closing_date}}.',
    priority: 2,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'clear_to_close_check',
    phase: 'pre_closing',
    name: 'Check clear to close status',
    description:
      'Verify with lender that the loan has received clear to close. This is the green light for closing.',
    trigger: { type: 'closing_minus_days', days: 10 },
    conditions: [{ field: 'financing_contingency_waived', operator: 'false' }],
    contact_role: 'lender',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      "Hi {{contact_name}}, we're {{days_remaining}} days from closing on {{property_address}} ({{closing_date}}). Has the loan received a clear to close? Are there any outstanding conditions that need to be met? Please let us know so we can ensure a smooth closing.",
    escalation_days: 2,
    escalation_message:
      'Lender has not confirmed clear to close for {{property_address}}. Closing is {{days_remaining}} days away.',
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'hoa_docs_check',
    phase: 'pre_closing',
    name: 'HOA documents status check',
    description:
      'Per RF401 Section 5.D, if property has HOA, seller must deliver lien payoff or statement of account at least 7 days before closing.',
    rf401_section: '5.D',
    trigger: { type: 'closing_minus_days', days: 10 },
    conditions: [{ field: 'has_hoa', operator: 'true' }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'remind',
    vera_message:
      "The property at {{property_address}} has an HOA. Per Section 5.D, the seller must deliver a lien payoff, estoppel letter, or statement of account at least 7 days before closing ({{closing_date}}). Has this been requested? I'd also recommend sending RF709 — Request for Association Information — if it hasn't been done.",
    related_rf_form: 'RF709',
    priority: 2,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'seller_disclosure_check',
    phase: 'pre_closing',
    name: 'Seller final property disclosure',
    description: 'RF202 Seller Final Property Disclosure should be completed before closing.',
    rf708_line: 99,
    trigger: { type: 'closing_minus_days', days: 10 },
    conditions: null,
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'remind',
    vera_message:
      "Has the Seller's Final Property Disclosure (RF202) been completed for {{property_address}}? This should be finalized before closing on {{closing_date}}.",
    related_doc_id: 'property_condition',
    related_rf_form: 'RF202',
    priority: 3,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  // ─── CLOSING WEEK (CD - 7 to CD) ──────────────────────────────

  {
    id: 'closing_week_lender_confirm',
    phase: 'closing_week',
    name: 'Final lender confirmation',
    description:
      'One week before closing, confirm closing docs will be ready and loan is funded.',
    trigger: { type: 'closing_minus_days', days: 7 },
    conditions: [{ field: 'financing_contingency_waived', operator: 'false' }],
    contact_role: 'lender',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      "Hi {{contact_name}}, we're one week from closing on {{property_address}} ({{closing_date}}). Can you confirm the closing disclosure has been sent to the buyer and the loan docs will be ready for closing? Are there any remaining conditions? Thank you.",
    escalation_days: 2,
    escalation_message:
      'One week to closing and lender has not confirmed docs ready for {{property_address}}.',
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'closing_week_title_confirm',
    phase: 'closing_week',
    name: 'Confirm closing scheduled with title company',
    description:
      'Verify closing time and location with the title company. Confirm all parties know where to be.',
    trigger: { type: 'closing_minus_days', days: 5 },
    conditions: [{ field: 'contacts', operator: 'exists', value: 'title' }],
    contact_role: 'title',
    channel: 'email',
    action_type: 'confirm',
    vera_message:
      'Hi {{contact_name}}, closing on {{property_address}} is scheduled for {{closing_date}}. Can you confirm the closing time, location, and that all closing documents will be ready? Are there any outstanding items from your end? Thank you.',
    escalation_days: 2,
    escalation_message:
      'Title company has not confirmed closing details for {{property_address}}. Closing is {{days_remaining}} days away.',
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'wire_fraud_reminder',
    phase: 'closing_week',
    name: 'Wire fraud warning to buyer',
    description:
      'Per RF401 lines 525-529, remind about wire fraud. NEVER accept wiring instructions from email without independent verification.',
    trigger: { type: 'closing_minus_days', days: 5 },
    conditions: null,
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'remind',
    vera_message:
      'Closing is {{days_remaining}} days away for {{property_address}}. IMPORTANT REMINDER: Please remind the buyer about wire fraud. Per the contract: "Never trust wiring instructions sent via email. Always independently confirm wiring instructions in person or via telephone." The buyer should verify wire instructions directly with the title company by phone using a number they already have on file — NOT from an email.',
    related_doc_id: 'wire_fraud_pre',
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'final_walkthrough_reminder',
    phase: 'closing_week',
    name: 'Final walkthrough reminder',
    description:
      'Per RF401 Section 10, buyer has the right to a final inspection on or within X days of closing to confirm property is in same or better condition.',
    rf708_line: 71,
    rf401_section: '10',
    trigger: { type: 'closing_minus_days', days: 3 },
    conditions: null,
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'remind',
    vera_message:
      "Closing is {{days_remaining}} days away for {{property_address}}. Has the final walkthrough been scheduled? Per Section 10, the buyer has the right to inspect the property on the closing date or within the agreed number of days prior to confirm it's in the same or better condition as the Binding Agreement Date.",
    check_weather: true,
    priority: 2,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'utilities_reminder',
    phase: 'closing_week',
    name: 'Utilities transfer reminder',
    description:
      'Remind agent to have buyer set up utility transfers for the closing date.',
    trigger: { type: 'closing_minus_days', days: 3 },
    conditions: null,
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'remind',
    vera_message:
      'Closing is {{days_remaining}} days away for {{property_address}}. Has the buyer been reminded to schedule utility transfers (electric, water, gas, internet) to their name effective on the closing date?',
    priority: 3,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  // ─── CLOSING DAY ───────────────────────────────────────────────

  {
    id: 'closing_day_confirmation',
    phase: 'closing_day',
    name: 'Closing day confirmation',
    description: 'Day of closing — confirm everything is a go with all parties.',
    trigger: { type: 'closing_minus_days', days: 0 },
    conditions: null,
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'inform',
    vera_message:
      "Today is closing day for {{property_address}}! 🏠\n\nChecklist:\n✅ Buyer brings valid government-issued photo ID\n✅ Cashier's check or wire transfer confirmed\n✅ Final walkthrough completed\n✅ All documents signed and uploaded\n\nCongratulations to {{buyer_names}}. If anything comes up today, I'm here.",
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  // ─── POST-CLOSING ──────────────────────────────────────────────

  {
    id: 'post_closing_congrats',
    phase: 'post_closing',
    name: 'Post-closing congratulations',
    description:
      'After closing, send congratulations and close out the transaction file.',
    trigger: { type: 'event', event: 'deal_closed' },
    conditions: null,
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'inform',
    vera_message:
      "{{property_address}} is officially CLOSED! 🎉 Congratulations. All transaction documents have been filed. If there's anything you need from this deal going forward, the full record is here in Closing Jet.",
    priority: 3,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  // ─── DOCUMENT COMPLIANCE (ongoing) ─────────────────────────────

  {
    id: 'fha_va_addendum_check',
    phase: 'contract_executed',
    name: 'FHA/VA addendum required',
    description:
      'Per RF401 Section 2.A lines 56-57, FHA and VA loans require their respective addendums attached to the contract.',
    rf401_section: '2.A',
    trigger: { type: 'bad_plus_days', days: 1 },
    conditions: [{ field: 'loan_type', operator: 'in', value: ['FHA', 'VA'] }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'request_doc',
    vera_message:
      "This is a {{loan_type}} loan for {{property_address}}. Per Section 2.A of the contract, the {{loan_type}} addendum (RF625) must be attached. I don't see it in the document file. Has it been included with the executed contract? This is a required document for {{loan_type}} financing.",
    related_doc_id: 'fha_va_addendum',
    related_rf_form: 'RF625',
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'lead_paint_check',
    phase: 'contract_executed',
    name: 'Lead-based paint disclosure required',
    description:
      'Per RF401 Section 7, lead-based paint disclosure is federally required for properties built before 1978.',
    rf401_section: '7',
    trigger: { type: 'bad_plus_days', days: 1 },
    conditions: [{ field: 'lead_based_paint', operator: 'true' }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'request_doc',
    vera_message:
      "The property at {{property_address}} was built before 1978. Per Section 7 and federal law, a Lead-Based Paint Disclosure must be attached to the contract. I don't see it in the file. Has this been completed and signed by all parties?",
    related_doc_id: 'lead_paint',
    priority: 1,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'hoa_recommend_rf709',
    phase: 'contract_executed',
    name: 'Recommend HOA information request',
    description:
      'Best practice: when property has an HOA, send RF709 to request association information (financials, rules, assessments).',
    trigger: { type: 'bad_plus_days', days: 2 },
    conditions: [{ field: 'has_hoa', operator: 'true' }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'recommend',
    vera_message:
      "The property at {{property_address}} has an HOA. I'd recommend sending RF709 — Request for Condominium/Association Information — to the HOA. This form requests the association's financial health, rules, pending assessments, and any violations. It's not required by the contract, but it protects your buyer from surprises. Your call on whether to send it.",
    related_rf_form: 'RF709',
    priority: 4,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  {
    id: 'temp_occupancy_check',
    phase: 'contract_executed',
    name: 'Temporary occupancy agreement check',
    description:
      'Per RF401 Section 4.A.1, if possession is not at closing, a Temporary Occupancy Agreement is required.',
    rf401_section: '4.A.1',
    trigger: { type: 'bad_plus_days', days: 1 },
    conditions: [{ field: 'possession_at_closing', operator: 'false' }],
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'request_doc',
    vera_message:
      'Possession on {{property_address}} is NOT at closing per the contract. A Temporary Occupancy Agreement is required — RF626 (buyer before closing) or RF627 (seller after closing). Has this been attached to the agreement?',
    related_doc_id: 'temp_occupancy_buyer',
    related_rf_form: 'RF626',
    priority: 2,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },

  // ─── DOCUMENT COMPLETENESS CHECK (weekly) ──────────────────────

  {
    id: 'weekly_doc_audit',
    phase: 'pre_closing',
    name: 'Weekly document completeness audit',
    description:
      "Every week, Vera checks the transaction's uploaded documents against the required/conditional checklist and flags what's missing.",
    trigger: { type: 'closing_minus_days', days: 21 },
    conditions: null,
    contact_role: 'agent',
    channel: 'agent_only',
    action_type: 'inform',
    vera_message:
      'Weekly document audit for {{property_address}}:\n\n{{doc_audit_results}}\n\nPlease review and upload any missing documents. Closing is {{closing_date}} ({{days_remaining}} days away).',
    priority: 3,
    check_weather: false,
    vera_can_act: true,
    vera_can_schedule: false,
  },
]

// ═══════════════════════════════════════════════════════════════════
// PLAYBOOK UTILITIES
// ═══════════════════════════════════════════════════════════════════

/** Get all plays for a specific phase */
export function getPlaysByPhase(phase: PlayPhase): PlaybookPlay[] {
  return TN_PLAYBOOK.filter((p) => p.phase === phase)
}

/** Get all plays that should fire on a given day relative to BAD */
export function getPlaysDueOnBADPlusDay(day: number): PlaybookPlay[] {
  return TN_PLAYBOOK.filter(
    (p) => p.trigger.type === 'bad_plus_days' && p.trigger.days === day
  )
}

/** Get all plays that should fire X days before closing */
export function getPlaysDueOnClosingMinusDay(day: number): PlaybookPlay[] {
  return TN_PLAYBOOK.filter(
    (p) => p.trigger.type === 'closing_minus_days' && p.trigger.days === day
  )
}

/** Get all plays triggered by a specific event */
export function getPlaysByEvent(event: string): PlaybookPlay[] {
  return TN_PLAYBOOK.filter(
    (p) => p.trigger.type === 'event' && p.trigger.event === event
  )
}

/** Get all plays that require weather check */
export function getWeatherSensitivePlays(): PlaybookPlay[] {
  return TN_PLAYBOOK.filter((p) => p.check_weather)
}

/** Evaluate whether a play's conditions are met for a given transaction */
export function evaluateConditions(
  play: PlaybookPlay,
  transaction: Record<string, unknown>
): boolean {
  if (!play.conditions) return true // null conditions = always applies

  return play.conditions.every((cond) => {
    const val = transaction[cond.field]

    switch (cond.operator) {
      case 'eq':
        return val === cond.value
      case 'neq':
        return val !== cond.value
      case 'true':
        return val === true
      case 'false':
        return val !== true
      case 'exists': {
        // Special handling for contacts array
        if (cond.field === 'contacts' && Array.isArray(val)) {
          return val.some((c: Record<string, unknown>) =>
            String(c.role || '')
              .toLowerCase()
              .includes(String(cond.value).toLowerCase())
          )
        }
        return val !== null && val !== undefined && val !== ''
      }
      case 'not_exists':
        return val === null || val === undefined || val === ''
      case 'in': {
        if (Array.isArray(cond.value)) {
          return cond.value.includes(String(val))
        }
        return false
      }
      case 'gt':
        return (
          typeof val === 'number' &&
          typeof cond.value === 'number' &&
          val > cond.value
        )
      case 'lt':
        return (
          typeof val === 'number' &&
          typeof cond.value === 'number' &&
          val < cond.value
        )
      default:
        return false
    }
  })
}

/**
 * Calculate the trigger date for a play given the transaction dates.
 * Returns null if the play cannot be scheduled (missing dates).
 */
export function calculateTriggerDate(
  play: PlaybookPlay,
  bindingDate: string | null,
  closingDate: string | null,
  inspectionEndDate: string | null
): Date | null {
  const parseDate = (d: string | null) => (d ? new Date(`${d}T12:00:00`) : null)

  switch (play.trigger.type) {
    case 'bad_plus_days': {
      const bad = parseDate(bindingDate)
      if (!bad || play.trigger.days === undefined) return null
      const target = new Date(bad)
      target.setDate(target.getDate() + play.trigger.days)
      return target
    }
    case 'closing_minus_days': {
      const cd = parseDate(closingDate)
      if (!cd || play.trigger.days === undefined) return null
      const target = new Date(cd)
      target.setDate(target.getDate() - play.trigger.days)
      return target
    }
    case 'ipe_minus_days': {
      const ipe = parseDate(inspectionEndDate)
      if (!ipe || play.trigger.days === undefined) return null
      const target = new Date(ipe)
      target.setDate(target.getDate() - play.trigger.days)
      return target
    }
    case 'state_entry':
    case 'event':
    case 'deadline_passed':
      return null // These are event-driven, not date-driven
    default:
      return null
  }
}
