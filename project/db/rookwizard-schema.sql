-- Schema for storing RF401 wizard data per transaction
CREATE TABLE IF NOT EXISTS rookwizard_rf401 (
  transaction_id TEXT PRIMARY KEY,
  -- Section 1
  buyer_name TEXT,
  seller_name TEXT,
  property_address TEXT,
  county TEXT,
  deed_instrument_reference TEXT,
  included_items TEXT[],
  remaining_items TEXT[],
  excluded_items TEXT[],
  leased_items TEXT[],
  fuel_adjustment TEXT DEFAULT 'unknown in current RF401 reference',
  -- Section 2.A–C
  purchase_price_numeric NUMERIC,
  purchase_price_written TEXT,
  loan_to_value_percent NUMERIC,
  financing_type TEXT CHECK (financing_type IN ('Conventional','FHA','VA','USDA','Other')),
  financial_contingency TEXT DEFAULT 'unknown in current RF401 reference',
  appraisal_contingency TEXT DEFAULT 'unknown in current RF401 reference',
  -- Section 2.D.1–3 + page 5
  seller_expenses TEXT,
  buyer_expenses TEXT,
  title_expense_allocation TEXT,
  buyer_closing_agency_name TEXT,
  buyer_closing_agency_contact TEXT,
  buyer_closing_agency_email TEXT,
  buyer_closing_agency_phone TEXT,
  buyer_deed_names TEXT[],
  -- Sections 3–6
  earnest_money_holder TEXT,
  earnest_money_amount NUMERIC,
  earnest_money_due_date DATE,
  closing_date DATE,
  possession_terms TEXT,
  inspection_period_end DATE,
  repair_period_end DATE,
  financing_deadline DATE,
  appraisal_deadline DATE,
  greenbelt_intent TEXT,
  special_assessments TEXT,
  warranties_transfer TEXT,
  hoa_fees TEXT,
  public_water_notes TEXT,
  public_sewer_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger or application logic should update updated_at on writes.
