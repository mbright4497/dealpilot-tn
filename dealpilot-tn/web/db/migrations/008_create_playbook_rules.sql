-- Migration: Create deal_playbook_rules and deal_playbook_progress

CREATE TABLE IF NOT EXISTS deal_playbook_rules (
  id SERIAL PRIMARY KEY,
  phase TEXT NOT NULL,
  milestone_key TEXT NOT NULL UNIQUE,
  milestone_label TEXT NOT NULL,
  description TEXT,
  days_from_binding INT,
  days_before_closing INT,
  required_document TEXT,
  responsible_party TEXT,
  advisory_source TEXT,
  priority TEXT DEFAULT 'normal',
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS deal_playbook_progress (
  id SERIAL PRIMARY KEY,
  deal_id INT NOT NULL REFERENCES transactions(id),
  milestone_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  notes TEXT,
  eva_action_taken TEXT,
  UNIQUE(deal_id, milestone_key)
);

-- Seed playbook rules (Tennessee RF401-compliant milestones)
-- Phase: BINDING (Days 0-3 from Binding Agreement Date)
INSERT INTO deal_playbook_rules(phase,milestone_key,milestone_label,description,days_from_binding,required_document,responsible_party,advisory_source,priority,sort_order)
VALUES
('BINDING','earnest_money_delivered','Earnest Money Delivered to Holder','Buyer to deliver earnest money to escrow/holder',2,'RF401 Section','buyer_agent','buyer_agent,broker','critical',10),
('BINDING','loan_application','Buyer Loan Application Filed','Buyer files loan application with lender',3,'RF401 Line 96','buyer/lender','lender,buyer_agent','critical',20),
('BINDING','credit_report_paid','Credit Report Paid','Buyer pays for credit report as part of loan application',3,NULL,'buyer','lender','normal',30),
('BINDING','seller_disclosure_delivered','Seller Property Disclosure (RF201) Delivered','Seller provides property disclosure (RF201)',0,'RF201','seller_agent','seller_agent,broker','critical',40),
('BINDING','agency_disclosure','Working with RE Professional (RF301) Signed','Agency disclosure (RF301) signed by parties',0,'RF301','both_agents','broker','normal',50),
('BINDING','wire_fraud_warning','Wire Fraud Warning (RF308) Delivered','Deliver wire fraud prevention notice (RF308)',0,'RF308','both_agents','title_attorney,broker','normal',60);

-- Phase: DUE_DILIGENCE (Days 3-10)
INSERT INTO deal_playbook_rules(phase,milestone_key,milestone_label,description,days_from_binding,required_document,responsible_party,advisory_source,priority,sort_order)
VALUES
('DUE_DILIGENCE','title_ordered','Title Search Ordered','Order title search/commitment',3,NULL,'buyer_agent/title_company','title_attorney','normal',100),
('DUE_DILIGENCE','inspection_scheduled','Home Inspection Scheduled','Schedule home inspection',5,NULL,'buyer_agent','inspector,buyer_agent','high',110),
('DUE_DILIGENCE','inspection_completed','Home Inspection Completed','Inspection performed and report generated',10,'Inspection Report','inspector','inspector,tc','critical',120),
('DUE_DILIGENCE','repair_request_sent','Repair Request/Amendment Sent','Send repair request or amendment (RF653)',10,'RF653 Amendment','buyer_agent','buyer_agent,tc','normal',130),
('DUE_DILIGENCE','wood_infestation_report','Wood Infestation Report Ordered','Order wood infestation (termite) report',7,NULL,'buyer_agent','inspector','normal',140);

-- Phase: POST_INSPECTION (Days 10-21)
INSERT INTO deal_playbook_rules(phase,milestone_key,milestone_label,description,days_from_binding,required_document,responsible_party,advisory_source,priority,sort_order)
VALUES
('POST_INSPECTION','repair_response','Seller Repair Response Received','Seller provides repair response',14,'RF653','seller_agent','seller_agent,tc','normal',200),
('POST_INSPECTION','appraisal_ordered','Appraisal Ordered','Order appraisal',10,NULL,'lender','lender','normal',210),
('POST_INSPECTION','appraisal_completed','Appraisal Completed','Appraisal completed and report returned',21,NULL,'lender','lender,buyer_agent','high',220),
('POST_INSPECTION','title_commitment_received','Title Commitment Received','Title company issues title commitment',14,'Title Commitment','title_company','title_attorney','high',230),
('POST_INSPECTION','title_exceptions_reviewed','Title Exceptions Reviewed','Title exceptions reviewed by counsel',17,NULL,'title_attorney','title_attorney,broker','normal',240),
('POST_INSPECTION','financing_contingency_status','Financing Contingency Status Check','Confirm financing contingency status',21,NULL,'lender','lender','critical',250);

-- Phase: PRE_CLOSING (Days 21-Close)
INSERT INTO deal_playbook_rules(phase,milestone_key,milestone_label,description,days_before_closing,required_document,responsible_party,advisory_source,priority,sort_order)
VALUES
('PRE_CLOSING','clear_to_close','Clear to Close from Lender','Lender issues clear to close',7,NULL,'lender','lender','critical',300),
('PRE_CLOSING','closing_disclosure_sent','Closing Disclosure Sent (3-day rule)','Send Closing Disclosure to buyer (TILA-RESPA 3-day rule)',3,'Closing Disclosure','lender','lender,title_attorney','critical',310),
('PRE_CLOSING','settlement_statement_review','Settlement Statement Review','Review settlement statement (HUD/closing statement)',3,'Settlement Statement','tc','tc,broker','normal',320),
('PRE_CLOSING','final_walkthrough_scheduled','Final Walkthrough Scheduled','Schedule final walkthrough',3,NULL,'buyer_agent','buyer_agent','normal',330),
('PRE_CLOSING','final_walkthrough_completed','Final Walkthrough Completed','Complete final walkthrough',1,NULL,'buyer_agent','buyer_agent,inspector','high',340),
('PRE_CLOSING','wire_instructions_confirmed','Wire Instructions Confirmed','Confirm wire instructions with title/company',2,NULL,'title_company','title_attorney','critical',350),
('PRE_CLOSING','utility_transfer_initiated','Utility Transfer Initiated','Initiate utility transfer',3,NULL,'buyer','tc','normal',360);

-- Phase: CLOSING (Day 0)
INSERT INTO deal_playbook_rules(phase,milestone_key,milestone_label,description,days_before_closing,required_document,responsible_party,advisory_source,priority,sort_order)
VALUES
('CLOSING','closing_completed','Closing Completed','Closing completed and funds exchanged',0,NULL,'all','tc,title_attorney','critical',400),
('CLOSING','deed_recorded','Deed Recorded','Record deed with county',-1,NULL,'title_company','title_attorney','normal',410),
('CLOSING','commission_disbursed','Commission Disbursed','Disburse agent commissions',-1,NULL,'title_company','broker','normal',420),
('CLOSING','keys_delivered','Keys Delivered to Buyer','Keys delivered to buyer at closing',0,NULL,'seller_agent','seller_agent,buyer_agent','normal',430)
ON CONFLICT DO NOTHING;
