# Closing Jet TN — Session State

## Completed today (April 11)
- Signature section removed from PDF output and wizard (12 questions deleted)
- Page 11 coords: firm/licensee/HOA only, all clean
- appraisal_2c_no_chk DELETED — was phantom coord causing rogue X on page 3
- title_expenses page 3: x:228 y:1177 calibrated and working
- appraisal_2c_yes_chk page 3: x:193 y:488 (checkbox for IS CONTINGENT)
- 66 questions in ContractWizard.tsx line 38

## Next session — in this order
1. Fix loan type data flow — wizard answer not overriding tx.loan_type in PDF
2. Data bridge — rookwizard_transactions → rf401_wizard JSONB only passes 7 fields
3. UI redesign — fill-in-the-blank contract style (ContractWizard.tsx full UI rebuild)
4. Page 2 — add financing_waived_proof text field for cash deals

## Key files
- Questions: src/components/wizard/ContractWizard.tsx line 38
- Coords: src/lib/rf401/fieldCoordinates.ts (ONE file only)
- PDF route: src/app/api/rf401/[transactionId]/generate/route.ts
- Wizard schema: src/lib/rookwizard.ts

## Rules
- Read file before touching it
- One task per Cursor tab
- npm run build before every commit
- git add -A always
- transactions.id = INTEGER
- Never touch RookWizard.tsx or /api/rookwizard/

## 66 questions live in
src/components/wizard/ContractWizard.tsx line 38
