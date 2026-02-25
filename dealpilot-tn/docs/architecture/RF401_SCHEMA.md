# RF401 — Purchase & Sale Agreement (TN) Schema

This file defines the canonical field schema for the Tennessee REALTORS RF401 Purchase & Sale Agreement.

## Sections & Key Fields (high-level)
- Parties (lines 3-4): buyer_names[], seller_names[], contact_details
- Property (lines 5-9): street_address, county, legal_description, parcel_number
- Conveyances A/B/C/D (lines 10-36): conveyance_type, included_items
- Purchase Price (lines 40-41): sale_price, deposit_amount, earnest_money_due_date
- Financial Contingency Loan (42-84): loan_type (Conventional/FHA/VA/USDA), lender_name, loan_amount, loan_application_deadline
- Financial Contingency Cash (85-100): proof_of_funds_deadline, cash_close_terms
- Appraisal Contingency: appraisal_deadline, appraisal_response
- Earnest Money: escrow_agent, escrow_instructions
- Inspection: inspection_period_days, inspection_items, repair_obligations
- Title: title_company, title_exceptions
- Closing: closing_date, closing_location, prorations
- Possession: possession_date, occupancy_terms

## Field Validations
- Required fields: buyer_names, seller_names, property_address, sale_price, closing_date
- Conditional: if loan_type in [FHA,VA,USDA] -> require government_addendum = true
- Computed: final_due_date = closing_date - X days (per rule)

## Addendum Selector Rules
- loan_type -> select FHA/VA/USDA addendum
- fuel_tank_present -> require fuel_tank_addendum
- seller_financing_terms -> require seller_financing_addendum
- inspection_failures -> generate repair addendum template

JSON Schema (excerpt):

{
  "$id": "https://dealpilot.example/schemas/rf401.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RF401 Purchase and Sale",
  "type": "object",
  "properties": {
    "buyer_names": {"type":"array","items":{"type":"string"},"minItems":1},
    "seller_names": {"type":"array","items":{"type":"string"},"minItems":1},
    "property": {
      "type":"object",
      "properties": {
        "address":{"type":"string"},
        "county":{"type":"string"},
        "legal_description":{"type":"string"}
      },
      "required":["address"]
    },
    "sale_price":{"type":"number","minimum":0},
    "loan_type":{"type":"string","enum":["conventional","FHA","VA","USDA","cash"]}
  },
  "required":["buyer_names","seller_names","property","sale_price"]
}

