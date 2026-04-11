# CLAUDE.md — Closing Jet (dealpilot-tn)

> **For Claude Code:** You are a dedicated software engineer for Closing Jet. Read this entire file before touching any code. All coding work happens inside `web/` — do not modify any other folder at repo root.

---

## ⚠️ SECURITY — CHECK THIS FIRST

The repo has a `/secrets` folder at root and was recently made **public**. Before doing anything else:

```bash
ls -la secrets/
cat secrets/*
```

If it contains real API keys or credentials, they are now publicly exposed. Immediately:
1. Rotate any exposed keys (Supabase, OpenAI, GHL, iLovePDF)
2. Delete or empty the `/secrets` folder
3. Confirm `web/.env.local` and `web/.env` are in `.gitignore`

---

## 1. Repo Structure

This is a **monorepo**. The Next.js app lives in `web/` — everything else is agent framework files, planning docs, and a separate HubLinkPro project. Claude Code only touches `web/`.

```
/                          ← repo root — agent framework docs (NOT your concern)
  web/                     ← ✅ ALL CLOSING JET CODE LIVES HERE
  apps/hublinkpro/         ← separate project — ignore
  docs/architecture/       ← architecture docs — read if needed
  memory/                  ← OpenClaw session logs — ignore
  secrets/                 ← ⚠️ check for exposed credentials
  .openclaw/               ← ignore
  AGENTS.md, SOUL.md,      ← OpenClaw agent framework — ignore
  MEMORY.md, USER.md, etc.
```

---

## 2. Local Development

> **Path note:** From repo root, all web files are under `dealpilot-tn/web/`, not `web/` directly.
> Git commands from root use `dealpilot-tn/web/src/...` paths.

```bash
cd dealpilot-tn/web
npm install
# create .env.local (see §5)
npm run dev         # dev server
npm run build       # ALWAYS run before pushing — TypeScript errors are blockers
```

**Production:** https://dealpilot-tn.vercel.app  
**Vercel Project ID:** `prj_GEtsUDwHkrf7zmEWb50LX5nIWSt6`  
**Vercel Team ID:** `team_YJ6o3botClI5ArEesI7fIbZD`  
**Vercel build root:** `web/` (set in Vercel project settings)

---

## 3. Product Identity

| | |
|---|---|
| **Product name** | Closing Jet |
| **AI assistant (UI/user-facing)** | **Vera** |
| **AI assistant (code/routes/env vars)** | **Reva** — DO NOT rename in code |
| **Owner** | Matt Bright — iHome Team, KW Kingsport, Tri-Cities TN |
| **First paying agent** | Laura Holtsclaw (onboarding milestone) |
| **Test user ID** | `9397bcd6-eb70-40e1-9a71-b5aa2f64bf72` |
| **Test deal** | Transaction ID `15` — 678 Fever Bell Drive |

**Mission:** Vera is a proactive, autonomous AI transaction coordinator — not a dashboard agents log into. She works on behalf of agents without requiring their attention. Every feature decision: *"Can Vera handle this automatically?"* If yes, build it that way.

---

## 4. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| Backend | Next.js API routes / server actions |
| Database | Supabase (Postgres + Auth + RLS) |
| AI | OpenAI Assistants API (GPT-4o) |
| Communications | GoHighLevel (GHL) via HubLinkPro — SMS + email |
| PDF generation | Custom pixel-coordinate filler (RF401) |
| PDF merge | iLovePDF API — canonical, replaced pdf-lib and JSZip |
| Hosting | Vercel, Node.js 24.x |

---

## 5. Environment Variables

In `web/.env.local` for local dev. Set in Vercel dashboard for production. Never commit.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # server-side only — never expose to client
OPENAI_API_KEY
GHL_API_KEY                    # location-level key — account-level will fail
GHL_LOCATION_ID
ILOVEPDF_PUBLIC_KEY
ILOVEPDF_SECRET_KEY
CRON_SECRET                    # protects /api/cron/* routes
NEXT_PUBLIC_BRAVE_API_KEY      # optional
```

---

## 6. App Structure (`web/`)

```
web/app/
  api/
    reva/
      chat/             ← in-app Vera chat endpoint
      inbound-sms/      ← inbound SMS → Vera reply loop
    cron/
      briefing-v2/      ← daily morning briefing, GPT-4o, 8am CT
    transactions/       ← CRUD
    documents/
      rf401/generate/   ← RF401 PDF pixel filler ⚠️ see §9
      bundle/           ← closing package merge via iLovePDF
    communications/     ← GHL send + inbound webhook
    service-providers/  ← vendor contact management
    eva/                ← ⚠️ DEAD CODE — do not touch, do not delete yet
  dashboard/
  service-providers/  ← standalone cross-deal service providers page (replaces /inspectors in nav)
  inspectors/         ← provider directory CRUD — still exists, linked from service-providers page
  transactions/[id]/    ← detail page: overview, checklist, docs, comms, vera tabs
  communications/
  assistant/            ← standalone Vera chat
  contract-wizard/      ← TurboTax-style RF401 guide with embedded Vera chat
  dev/rf401-calibrate/  ← visual pixel coordinate calibration tool

web/lib/
  supabase/             ← server + browser client helpers
  reva/
    buildRevaContext.ts ← ⭐ MOST IMPORTANT FILE — injects deal context + rules
    revaClient.ts       ← OpenAI Assistants API wrapper
  ghl/                  ← SMS send, email send, contact helpers

web/public/forms/       ← blank PDFs: RF401, RF301, RF402
```

---

## 7. Database Schema

### `transactions` — THE live table (integer PK). Never use `deals` — it is legacy.

```sql
id                    INTEGER PRIMARY KEY
agent_id              UUID REFERENCES profiles(id)
address               TEXT
status                TEXT  -- 'active'|'under_contract'|'closed'|'cancelled'
deal_type             TEXT  -- 'buyer'|'seller'|'both'
financing_type        TEXT  -- 'conventional'|'fha'|'va'|'cash'|'usda'
purchase_price        NUMERIC
closing_date          DATE
inspection_deadline   DATE
financing_deadline    DATE
appraisal_deadline    DATE
earnest_money         NUMERIC
earnest_money_held_by TEXT
contacts              JSONB  -- [{name, role, phone, email, ghl_contact_id}]
home_warranty         BOOLEAN
items_remaining       TEXT
items_not_remaining   TEXT
leased_items          TEXT
```

### `communications`
```sql
id          BIGINT PRIMARY KEY
deal_id     INTEGER  -- ← INTEGER FK to transactions(id). NOT UUID.
agent_id    UUID
direction   TEXT  -- 'outbound'|'inbound'
channel     TEXT  -- 'sms'|'email'
to_name / to_contact / message / status  TEXT
```

### `reva_sms_threads`
```sql
id               BIGINT PRIMARY KEY
deal_id          INTEGER
phone_number     TEXT  -- E.164: +1XXXXXXXXXX
openai_thread_id TEXT
last_message_at  TIMESTAMPTZ
```

### `profiles`
```sql
id             UUID REFERENCES auth.users(id)
full_name / email / role / ghl_contact_id  TEXT
```

**RLS is enabled on all 5 critical tables.** Use service role key only in server-side API routes.

---

## 8. Vera / Reva Architecture

### Communication flows (all working)

| Flow | Route | Notes |
|---|---|---|
| Outbound SMS | `/api/communications/` → GHL | Version `2021-04-15`, type `2`, E.164 phone |
| Outbound email | `/api/communications/` → GHL | Version `2021-07-28`, requires `ghl_contact_id` |
| Inbound SMS | webhook → `/api/reva/inbound-sms` | loads deal context → Vera reply → GHL |
| Morning briefing | `/api/cron/briefing-v2` | GPT-4o, daily 8am CT |
| Email ingestion | `reva@ihomehq.com` | forwarded DocuSign/KW Command emails |

### GHL API rules
- SMS: header `Version: 2021-04-15`
- Email: header `Version: 2021-07-28`
- Phone numbers: always E.164 normalize before sending
- **Location-level API key required** (not account-level)
- GHL numeric message type `2` = SMS

### Vendor email problem
Vendors added manually to the `contacts` JSONB without a `ghl_contact_id` silently break email send. They must go through the Service Providers system, or be auto-provisioned via GHL API on deal save with the returned ID written back to JSONB.

### Extending Vera
Add domain rules and context to `lib/reva/buildRevaContext.ts`. The OpenAI Assistant already has TN RE knowledge loaded (RF401, TN law, video transcripts) — extend via context injection, don't rebuild.

---

## 9. RF401 PDF Generation — Critical

**⚠️ FIELD_COORDS lives in TWO files. Always update BOTH:**
```
web/app/api/documents/rf401/generate/route.ts  ← standalone duplicate
web/lib/fieldCoordinates.ts                     ← shared reference
```
Missing one causes silent field misalignment with no error thrown.

**Calibration:** `/dev/rf401-calibrate` — visual overlay for adjusting x/y without editing code.

**Closing package:** `/api/documents/bundle` → iLovePDF API merges docs → displayed in split-panel viewer. Use iLovePDF only — not pdf-lib, not JSZip.

---

## 10. What's Built vs. Missing

### ✅ Built & Working
- Dashboard, Transactions CRUD, Transaction detail (all tabs)
- AI Checklist — 27 items, 3 phases (pre_contract / under_contract / closing), AI-generated per deal
- Vera in-app chat — OpenAI Assistants, deal context, thread persistence
- Bidirectional SMS — end-to-end via GHL ✓
- Email outbound — works for contacts with `ghl_contact_id` ✓
- Inbound SMS → Vera reply loop — deal context + thread persistence ✓
- Morning briefing cron — GPT-4o, daily ✓
- RF401 PDF generation — pixel filler, all supplemental fields wired ✓
- Contract Wizard — TurboTax-style RF401 guide, BAD section, auto addenda, embedded Vera chat ✓
- Document upload — Supabase Storage, supplemental doc types ✓
- Split-panel PDF viewer — inline preview in documents tab ✓
- Closing package bundle — iLovePDF merge → viewer panel ✓
- Service Providers system — vendor contacts with GHL ID support ✓
- RLS on all 5 critical tables ✓
- Brand rename: Closing Jet / Vera in UI; Reva in code ✓

### ❌ Not Built / Incomplete

| Priority | Feature | What's needed |
|---|---|---|
| ✅ ~~P0~~ | ~~Transaction detail flash-of-old-content~~ | Fixed — `useLayoutEffect` resets 10+ state slices before paint; `latestTxIdRef` guards all 4 loaders so stale responses can't overwrite current deal |
| **P1** | GHL lead nurture separation | `closing-jet-active` tag on deal create; smart list excluding tagged contacts from nurture on number 564; separate from number 427 |
| **P1** | Vera proactive deadline nudges | `/api/cron/deadline-nudges` — for each deal with deadline within N days, Vera initiates messages to relevant parties |
| **P1** | Vendor email auto-provision | Auto-create GHL contact for vendors on deal save if no `ghl_contact_id`; write returned ID back to JSONB |
| **P1** | Laura Holtsclaw onboarding | Magic link invite flow, RLS audit (zero iHome data leakage), remove hardcoded iHome refs |
| **P2** | Deadline push/email/SMS alerts | Notify agents when deadlines approach — not just display them |
| **P3** | EVA dead code cleanup | Delete `web/app/api/eva/` and `web/lib/eva/` — confirmed dead, defer to rainy day |
| **P4** | RF301 / RF402 generation | Need same pixel-coordinate filler treatment as RF401 |
| **P4** | Bring-your-own-docs / national expansion | Agent-uploaded state forms; Vera becomes state-agnostic |

---

## 11. Non-Negotiable Working Rules

1. **Surgical changes only.** Read the file first. Propose minimal diffs. Never rewrite entire files without explicit approval from Matt.
2. **`npm run build` must pass** before any push. TypeScript errors are blockers.
3. **All git operations through Cursor.** Do not push autonomously.
4. **Match existing patterns.** Look at neighboring files before writing anything new.
5. **`transactions` table, integer PKs.** `deals` is legacy — never write to it.
6. **`communications.deal_id` is `INTEGER`.** Not UUID. Easy mistake.
7. **RF401: update both FIELD_COORDS files every time.** No exceptions.
8. **No PII in logs.** No names, phones, emails, or addresses in `console.log`.
9. **Service role key only in server-side routes.** Never in client components or `NEXT_PUBLIC_*`.

---

## 12. OpenClaw Agent Framework — Context Only

The root of the repo contains an OpenClaw multi-agent system used for a separate lead gen / CRM automation project. The agents (Tango, Marcus/Mini, Dev/Workhorse, Carlos, Nina, Maya) are **not Closing Jet code**. Ignore all root-level `.md` files for coding purposes.

As Claude Code, you are functionally the **Dev (Workhorse)** role: write code in `web/`, run builds, commit with clear messages, ship working features. Markdown files in the workspace are not deliverables — committed, passing code is.

---

## 13. Architecture Principles

1. **Vera is an agent, not a tool.** She acts autonomously. Agents shouldn't have to log in to make her work.
2. **Extend `buildRevaContext.ts`, don't rebuild.** All domain knowledge flows from context injection.
3. **Tennessee-first.** Don't prematurely abstract for national expansion.
4. **Auditability.** Every Vera action = a row in `communications` or a structured log.
5. **Deterministic before agentic.** Crons and explicit triggers before open-ended AI chains.
