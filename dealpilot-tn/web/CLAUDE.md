# Closing Jet TN — Web Session Context

## Working Directory
Always work in: `dealpilot-tn/dealpilot-tn/web/`

---

## Critical File Paths

### FIELD_COORDS — ONE source of truth
```
src/lib/rf401/fieldCoordinates.ts         ← canonical FIELD_COORDS + SCALE constant
```
The generate route imports directly from here. There is **no second copy**. The old CLAUDE.md
claiming two files was stale — those paths (`src/lib/fieldCoordinates.ts` and
`src/app/api/transactions/[id]/rf401/route.ts`) do not exist.

### RF401 Generate Route
```
src/app/api/rf401/[transactionId]/generate/route.ts
```
GET endpoint. Reads from `transactions` table + `transactions.rf401_wizard` JSONB + `profiles`.
Imports FIELD_COORDS from `src/lib/rf401/fieldCoordinates.ts`. Uses pdf-lib to stamp fields
onto `public/forms/rf401-blank.pdf`.

### RF401 Draft Route
```
src/app/api/rf401/[transactionId]/draft/route.ts
```
GET/POST. Stores/retrieves the RookWizard `Rf401DraftState` (inspection data: propertyAddress,
inspectionDate, deficiencies, overallStatus) in `deal_field_values` table with
`field_key = 'rf401_wizard'`. **Not connected to the generate route.**

### RookWizard Component
```
src/components/RookWizard.tsx             ← do not rewrite without approval
```
4-step modal wizard. Saves contract section data to `rookwizard_transactions` table via:
```
src/app/api/rookwizard/[transaction_id]/start/route.ts
src/app/api/rookwizard/[transaction_id]/section-1/route.ts
src/app/api/rookwizard/[transaction_id]/section-2/route.ts
src/app/api/rookwizard/[transaction_id]/section-2d/route.ts
src/app/api/rookwizard/[transaction_id]/sections-3-6/route.ts
src/app/api/rookwizard/[transaction_id]/complete/route.ts
src/app/api/rookwizard/[transaction_id]/export/route.ts
src/app/api/rookwizard/helpers.ts         ← shared DB helpers for all rookwizard routes
```

### RookWizard Library
```
src/lib/rookwizard.ts                     ← section types, field definitions, sanitize/merge helpers
```

---

## RF401 Wizard — Current State

### What's Done
- **Step 1 — Connect Deal**: working. DealPickerModal selects a transaction; auto-populates
  `section_1` (buyer_name, seller_name, property_address) from `/api/transactions/[id]` and
  contact records. Saves to `rookwizard_transactions`.
- **Step 2 — Verify Parties**: working. Edits buyer/seller legal names, confirms and saves
  `section_1` to `rookwizard_transactions`.
- **Step 3 — Fill RF401**: UI complete. Collects inspection-style data: property address,
  inspection date, deficiencies (HVAC / Plumbing / Electrical / Roof / Foundation /
  Appliances / Other with notes), overall status (Satisfactory / Unsatisfactory /
  Satisfactory with exceptions). "Save draft" posts to `/api/rf401/[id]/draft` →
  `deal_field_values`. **This data does NOT flow to the generate route.**
- **Step 4 — Review & Generate**: completeness score displays, deficiency list displays.
  "Save to Deal" finalizes draft. "Export PDF" is a **stub** — `handleRequestExport()` only
  sets a message string; no actual PDF generation is wired.
- Page 11 signature section coords: calibrated and present in FIELD_COORDS (buyer/seller
  offer dates, seller response checkboxes, binding agreement fields, firm info, HOA info).

### What's Incomplete / Known Gaps
1. **Export PDF stub**: `handleRequestExport` in RookWizard.tsx just sets an info string.
   Real export should call `/api/rf401/[transactionId]/generate`.
2. **Data flow disconnection**: RookWizard saves to `rookwizard_transactions`. The generate
   route reads from `transactions.rf401_wizard` JSONB. These are separate storage paths with
   no sync. `completeWizard()` calls `/api/intake-apply` to write back section data to
   `transactions`, but the named JSONB keys expected by the generate route
   (`str('home_warranty')`, `str('offer_exp_date')`, etc.) may not be populated by that path.
3. **`rookwizard_transactions.transaction_id` is TEXT** (`RookWizardRow` type in
   `src/lib/rookwizard.ts`). `transactions.id` is INTEGER. Coercion happens implicitly in
   Supabase queries but could cause issues — `.eq('transaction_id', transactionId)` where
   `transactionId` is a string works, but verify no integer comparison breaks downstream.
4. **RF401 contract sections not collected in wizard UI**: `lib/rookwizard.ts` defines
   `section_2` (purchase price, LTV, financing), `section_2d` (expenses, closing agency,
   deed names), and `section_3_6` (earnest money, dates, HOA, offer expiration), but
   RookWizard.tsx Step 3 shows only the inspection deficiency form — the full contract
   section forms are not rendered in the UI yet.

---

## Data Flow: Wizard → rookwizard_transactions → Generate Route

```
RookWizard.tsx
  └─ Step 1: handleSaveSection('section_1') → PUT /api/rookwizard/[id]/section-1
  └─ Step 2: handleSaveSection('section_1') → PUT /api/rookwizard/[id]/section-1
  └─ Step 3: persistRf401Data('draft')      → POST /api/rf401/[id]/draft
                                               → deal_field_values (NOT transactions)
  └─ Step 4: handleComplete()               → POST /api/rookwizard/[id]/complete
                                               → calls /api/intake-apply (writes transactions)
                                             + persistRf401Data('submitted')
                                               → deal_field_values

/api/rf401/[transactionId]/generate (GET)
  └─ reads transactions.* (core fields via column select)
  └─ reads transactions.rf401_wizard (JSONB) via wiz variable
       str('key')    → wiz['key'] as string
       strRf(N)      → wiz['rf401_N'] as string  (numbered fallback keys)
       boolWiz('key') → wiz['key'] === true
  └─ reads profiles.* (buying agent/firm info)
  └─ stamps FIELD_COORDS onto public/forms/rf401-blank.pdf
  └─ returns filled PDF as attachment
```

**Bottom line**: the generate route does NOT read from `rookwizard_transactions`. For wizard
answers to appear in a generated PDF, they must first be written to `transactions.rf401_wizard`
JSONB (or individual `transactions` columns).

---

## rookwizard_transactions Schema (sections)

| Section | Key fields |
|---|---|
| `section_1` | buyer_name, seller_name, property_address, county, deed_instrument_reference, included_items[], remaining_items[], excluded_items[], leased_items[], fuel_adjustment |
| `section_2` | purchase_price_numeric, purchase_price_written, loan_to_value_percent, financing_type, financial_contingency, appraisal_contingency |
| `section_2d` | seller_expenses, buyer_expenses, title_expense_allocation, buyer_closing_agency_name/contact/email/phone, buyer_deed_names[] |
| `section_3_6` | earnest_money_holder/amount/due_date, closing_date, possession_terms, inspection/repair/financing/appraisal deadlines, greenbelt_intent, hoa_name/phone/email, final_inspection_days, offer_expiration_date |

Empty strings are stored as `'unknown in current RF401 reference'` (`UNKNOWN_MARKER`).
`wizard_step` and `wizard_status` track progress (step 2–5, status `section-N-saved`).

---

## FIELD_COORDS Coverage (fieldCoordinates.ts)

Pages with mapped fields: **1, 2, 3, 4, 5, 6, 7, 8, 10, 11**. Page 9 has no fields mapped.

Key field groups:
- Page 1: buyer/seller names, property address/city/zip/county, deed book/pages/instrument,
  further legal description, garage remotes, items remaining/not remaining/leased, purchase
  price (numeric + words), LTV%
- Page 2: loan type checkboxes, financing waived, appraisal not contingent
- Page 3: appraisal 2c yes/no, title expenses, expense mod lines 1–4, closing agency buyer,
  earnest money other method
- Page 4: closing agency seller, earnest days/holder name/address/amount, closing day/month/year,
  possession at closing checkbox
- Page 5: deed names, greenbelt maintain/not maintain checkboxes
- Page 6: lead-based paint not apply / applies checkboxes, inspection period days
- Page 7: resolution period days, final inspection days, waive repair request / all inspections
- Page 8: HPP (home protection plan) paid by, amount, provider, ordered by, waived/yes checkboxes
- Page 10: exhibits/addenda, special stipulations, offer expiration time/day/month-year
- Page 11: buyer1/2 offer date/time/ampm, seller response checkboxes (accepts/counters/rejects),
  seller1/2 date/time/ampm, binding agreement acknowledged-by/date/time/ampm,
  listing + buying firm name/address/license/phone/licensee name/number/email/cell, HOA name/phone/email

SCALE = 72/150 (converts 150dpi pixel coords to PDF points).

---

## Critical Rules

1. **FIELD_COORDS has ONE source**: `src/lib/rf401/fieldCoordinates.ts`. Do not create a
   second copy. The generate route imports from there.
2. **`npm run build` must pass** before any commit. TypeScript errors are blockers.
3. **All git operations through Cursor** — do not push autonomously.
4. **Do not rewrite entire files** without explicit approval. Surgical diffs only.
5. **`transactions` table uses INTEGER PKs**. `deals` is legacy/dead — never touch it.
6. **`communications.deal_id` is INTEGER**, not UUID.
7. **AI assistant is "reva" in code** — never rename to "vera" in routes, env vars, or lib files.
8. **No PII in console.log** — no names, phones, emails, addresses.
9. **Service role key only in server-side routes** — never in client components or NEXT_PUBLIC_*.
10. **Do not modify `src/components/RookWizard.tsx` or `src/app/api/rookwizard/`** without
    explicit instructions — these are stable scaffolding.

---

## Stack
Next.js 14 App Router, TypeScript, Supabase (gtaugdsxshganarifdoi), OpenAI Assistants, GHL, Vercel Pro
Calibration tool: `/dev/rf401-calibrate`
Blank PDF: `public/forms/rf401-blank.pdf`
