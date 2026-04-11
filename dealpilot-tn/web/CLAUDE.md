# Closing Jet TN — Session Context

## Working Directory
Always work in: dealpilot-tn/dealpilot-tn/web/

## Active Work: RF401 Contract Wizard
- Status: 90% complete, Page 1 clean
- Calibration tool: dealpilot-tn.vercel.app/dev/rf401-calibrate

### Remaining fixes:
1. Page 11 signature section — seller checkboxes + binding agreement date (need coord calibration)
2. Batch 3 wizard questions — resolution period, final inspection days, offer expiration, HOA fields
3. rookwizard_transactions.transaction_id is TEXT — verify it doesn't break integer transaction flow

## Critical Rules
- FIELD_COORDS lives in TWO files — always update both together:
  - src/lib/fieldCoordinates.ts
  - src/app/api/transactions/[id]/rf401/route.ts
- DO NOT touch: src/components/RookWizard.tsx or src/app/api/rookwizard/
- AI assistant internal name is "reva" in code — never rename
- transactions.id = INTEGER (active), deals.id = UUID (legacy/dead)
- git add -A always, npm run build before every commit

## Stack
Next.js 14 App Router, TypeScript, Supabase, OpenAI Assistants, GHL, Vercel Pro
Supabase project: gtaugdsxshganarifdoi
