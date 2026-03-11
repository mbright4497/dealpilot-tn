# RF401 Buyer Wizard Spec

## Purpose
Capture the buyer-centric data points required by the RF401 v01/01/2026 contract sections 1 through 6. Each wizard step mirrors the contract structure so the resulting data can be mapped directly into the document or API payloads.

## Wizard Steps
1. **Purchase and Sale Details (Section 1)**
   - Collect buyer and seller legal names.
   - Capture property address, county, and deed/instrument reference.
   - Note included, remaining, and excluded items.
   - Record leased items and any fuel adjustment references.
   - Flag any values that are not supplied as `"unknown in current RF401 reference"`.

2. **Purchase Price and Payment (Sections 2.A–C)**
   - Ask for numeric and written purchase price.
   - Record loan-to-value percentage and financing type (Conventional/FHA/VA/USDA/Other).
   - Capture whether the financial contingency is waived or preserved.
   - Capture appraisal contingency status (required, waived, or unknown).

3. **Closing Expenses and Title Contacts (Section 2.D.1–3, page 5)**
   - Track seller expenses, buyer expenses, and title expense allocation.
   - Capture closing agency for the buyer, including company name, contact person, email, and phone.
   - Record deed names for the buyer side (see Section 5.C).

4. **Timing, Possession, and Conditions (Sections 3–6)**
   - Specify earnest money holder, amount, and due date.
   - Set anticipated closing date, possession terms, and any occupancy notes.
   - Record inspection and repair period deadlines.
   - Capture financing and appraisal deadlines and greenbelt intent.
   - Note special assessments, warranty transfers, HOA obligations, and public water/sewer notes.

## JSON Field Schema
```json
{
  "transaction_id": "string",
  "section_1": {
    "buyer_name": "string",
    "seller_name": "string",
    "property_address": "string",
    "county": "string",
    "deed_instrument_reference": "string",
    "included_items": "array of strings",
    "remaining_items": "array of strings",
    "excluded_items": "array of strings",
    "leased_items": "array of strings",
    "fuel_adjustment": "string"
  },
  "section_2": {
    "purchase_price_numeric": "number",
    "purchase_price_written": "string",
    "loan_to_value_percent": "number",
    "financing_type": "enum (Conventional, FHA, VA, USDA, Other)",
    "financial_contingency": "string",
    "appraisal_contingency": "string"
  },
  "section_2d": {
    "seller_expenses": "string",
    "buyer_expenses": "string",
    "title_expense_allocation": "string",
    "buyer_closing_agency_name": "string",
    "buyer_closing_agency_contact": "string",
    "buyer_closing_agency_email": "string",
    "buyer_closing_agency_phone": "string",
    "buyer_deed_names": "array of strings"
  },
  "section_3_6": {
    "earnest_money_holder": "string",
    "earnest_money_amount": "number",
    "earnest_money_due_date": "date",
    "closing_date": "date",
    "possession_terms": "string",
    "inspection_period_end": "date",
    "repair_period_end": "date",
    "financing_deadline": "date",
    "appraisal_deadline": "date",
    "greenbelt_intent": "string",
    "special_assessments": "string",
    "warranties_transfer": "string",
    "hoa_fees": "string",
    "public_water_notes": "string",
    "public_sewer_notes": "string"
  }
}
```

> Store any field that is not yet supplied with the literal word `"unknown in current RF401 reference"` so the data can be flagged for follow-up.
