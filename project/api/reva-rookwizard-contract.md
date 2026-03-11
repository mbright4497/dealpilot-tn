# Reva Rookwizard Contract

## Overview
This API defines the step-by-step interactions between the Reva dashboard and the RF401 buyer wizard. Each endpoint receives a `transaction_id` and data that map to the RF401 v01/01/2026 sections described in the contract reference. Missing values stay `"unknown in current RF401 reference"` until completed.

## Endpoints

### 1. `POST /api/rookwizard/{transaction_id}/start`
- **Purpose:** Initialize the wizard for a transaction and retrieve the current state (if present).
- **Payload:** `{}`
- **Response:**
  ```json
  {
    "transaction_id": "string",
    "step": 1,
    "wizard_data": { /* section placeholders as in specs */ },
    "status": "initialized"
  }
  ```

### 2. `PUT /api/rookwizard/{transaction_id}/section-1`
- **Purpose:** Save Purchase and Sale details (Section 1).
- **Payload:**
  ```json
  {
    "buyer_name": "string",
    "seller_name": "string",
    "property_address": "string",
    "county": "string",
    "deed_instrument_reference": "string",
    "included_items": ["string"],
    "remaining_items": ["string"],
    "excluded_items": ["string"],
    "leased_items": ["string"],
    "fuel_adjustment": "string"
  }
  ```
- **Response:** `{ "step": 2, "status": "section-1-saved" }`

### 3. `PUT /api/rookwizard/{transaction_id}/section-2`
- **Purpose:** Capture purchase price, financing, and contingencies (Sections 2.A–C).
- **Payload:**
  ```json
  {
    "purchase_price_numeric": 0,
    "purchase_price_written": "string",
    "loan_to_value_percent": 0,
    "financing_type": "Conventional|FHA|VA|USDA|Other",
    "financial_contingency": "waived|preserved|unknown in current RF401 reference",
    "appraisal_contingency": "required|waived|unknown in current RF401 reference"
  }
  ```
- **Response:** `{ "step": 3, "status": "section-2-saved" }`

### 4. `PUT /api/rookwizard/{transaction_id}/section-2d`
- **Purpose:** Store closing expense and title agency details (Section 2.D.1–3 + page 5).
- **Payload:**
  ```json
  {
    "seller_expenses":"string",
    "buyer_expenses":"string",
    "title_expense_allocation":"string",
    "buyer_closing_agency_name":"string",
    "buyer_closing_agency_contact":"string",
    "buyer_closing_agency_email":"string",
    "buyer_closing_agency_phone":"string",
    "buyer_deed_names":["string"]
  }
  ```
- **Response:** `{ "step": 4, "status": "section-2d-saved" }`

### 5. `PUT /api/rookwizard/{transaction_id}/sections-3-6`
- **Purpose:** Finalize timing, inspections, warranties, and utilities (Sections 3–6).
- **Payload:**
  ```json
  {
    "earnest_money_holder":"string",
    "earnest_money_amount":0,
    "earnest_money_due_date":"YYYY-MM-DD",
    "closing_date":"YYYY-MM-DD",
    "possession_terms":"string",
    "inspection_period_end":"YYYY-MM-DD",
    "repair_period_end":"YYYY-MM-DD",
    "financing_deadline":"YYYY-MM-DD",
    "appraisal_deadline":"YYYY-MM-DD",
    "greenbelt_intent":"string",
    "special_assessments":"string",
    "warranties_transfer":"string",
    "hoa_fees":"string",
    "public_water_notes":"string",
    "public_sewer_notes":"string"
  }
  ```
- **Response:** `{ "step": 5, "status": "section-3-6-saved" }`

### 6. `POST /api/rookwizard/{transaction_id}/complete`
- **Purpose:** Mark the wizard complete and return a summary for review or export.
- **Payload:** `{ "final_review_notes": "string" }
- **Response:**
  ```json
  {
    "transaction_id": "string",
    "completed_at": "ISO-8601",
    "summary": {
      "missing_fields": ["string"],
      "next_actions": "string"
    },
    "status": "complete"
  }
  ```

## Notes
- Every \`PUT\` call should merge data with existing wizard state; unspecified fields should remain as `"unknown in current RF401 reference"` unless overwritten.
- If client submits malformed or conflicting data, the API returns HTTP 400 with a payload describing which RF401 section is affected.
