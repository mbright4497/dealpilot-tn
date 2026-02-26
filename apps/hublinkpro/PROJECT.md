# HubLinkPro - PROJECT.md

Status: ACTIVE — Foundation Stage / Launch Ads & Lead Gen (2026-02-26)

Owner: Matt (iHome Team, Keller Williams - Kingsport)

Summary

HubLinkPro is an AI-powered assistant for real estate agents focused on new-construction homes in the Tri-Cities TN (Johnson City, Kingsport, Bristol). The product surface is a GoHighLevel (GHL) funnel + conversational AI workflows that qualify leads, answer property questions, and hand off warm prospects to agents. Current priority: validate demand with paid ads and start driving leads today.

Current status (real)

- App is live: dealpilot-tn build green (c192ba3 deployed on Vercel) and recent fixes for transaction contact persistence merged to main.
- GHL is the primary frontend and funnel host; product funnels and workflows exist but ads are not yet live.
- Foundation Stage deliverables defined (ICP, ad copy, landing page copy, GHL workflow spec, launch checklist). Workhorse is available to populate deliverables.
- Memory and daily files maintained in workspace; placeholders created for BOOTSTRAP.md and PROJECT.md earlier and replaced now.

Architecture

- Frontend / App: GoHighLevel for landing pages and funnel; Next.js app (dealpilot-tn) for agent-facing dashboard and transaction tools.
- Backend / Data: Supabase (used in the Next.js app via auth-helpers) for deals, deadlines, documents, and compliance records.
- AI & Integrations: OpenAI endpoints (chat, extract) used in serverless API routes; deadlines generation is via /api/deadlines/generate.
- Ads & CRM: Meta/Facebook Ads connected; leads routed into GoHighLevel sub-account (ai.hublinkpro.com) and into workflows that send SMS/email + AI intro.
- Dev & Deploy: GitHub repo (mbright4497/dealpilot-tn) → Vercel for production; CI build steps use npm run build.

Current phase

- Foundation & Demand Validation (active): Create ICP, ad creatives, landing page copy, and GHL workflow. Run a $20/day FB ad test (3 variations) to validate lead quality before expanding product features.
- Engineering: Hotfixes and UX improvements (transaction contact persistence, deal creation wizard) are complete and merged to main. Continue small iterative work as ads generate feedback.

Risks & Blockers

- Live web search / market intel blocked until Brave Search key provided (affects market-intel and social posts). Workarounds: paste listing/MLS links or allow manual input.
- Ads must be validated quickly to avoid building features before demand is proven.
- Ensure deadlines generation API handles additional fields (inspection_date) introduced in new deal flow.

Next steps (immediate, today)

1) Ads & Funnels (HIGH PRIORITY)
   - Finalize ICP doc and ad-campaign.md (3 FB ad variations) in project/ directory — delegate to Workhorse to create copy/creative brief immediately.
   - Create landing-page.md for GHL funnel and upload to GHL; include lead magnet: "Free New Construction Guide — Tri-Cities TN".
   - Budget: $20/day split across 3 variations for a minimum 3–5 day test.

2) GHL Workflow (HIGH PRIORITY)
   - Implement workflow: trigger = FB lead → instant SMS+email with guide → 5-min AI intro → 24hr follow-up → 3-day check-in. Tag leads by ad variation.
   - Test end-to-end with a sample lead and confirm lead routing into Supabase/CRM.

3) Engineering (MEDIUM)
   - Monitor incoming leads and ensure deal creation flow populates required fields (price/value, binding_date, closing_date, inspection_date).
   - Add server-side persist for contacts if needed (currently persisted in parent transactions state; consider saving to Supabase on change).
   - Add small automated tests for contact persistence and deal creation if time allows.

4) Market Intel & Social (MEDIUM)
   - Enable web search (provide Brave API key) or paste 2–3 live listing links for new construction under $400K; update project/market-intel.md and project/daily-post.md with verified listings and CTA (Matt phone).

5) Ops & Handoff (LOW)
   - Prepare Launch Checklist with explicit steps to create FB ad, connect lead form to GHL, activate workflow, and test end-to-end. Save at project/launch-checklist.md.

Where things live (paths)

- Workspace: ~/apps/hublinkpro (project repo and assets)
- Deliverables (in this workspace): project/icp.md, project/ad-campaign.md, project/landing-page.md, project/ghl-workflow.md, project/launch-checklist.md
- App repo: /Users/Tango/.openclaw/workspace-mini/dealpilot-tn
- Memory: memory/2026-02-26.md (session log)

Who to contact / responsibilities

- Matt: final approvals, phone number for CTA, ad spend sign-off.
- Workhorse: build drafts for ICP, ad copy, landing page, and GHL workflow (use ESTIMATES if web search blocked but mark clearly).
- Mini (this agent): orchestrate Workhorse tasks, run builds/tests, maintain memory and PROJECT.md.

Acceptance criteria (for Foundation Stage)

- Three FB ad variations created and uploaded to Meta with $20/day budget.
- GHL landing page live with lead magnet and lead form connected to the workflow.
- Workflow routes leads to CRM and triggers immediate SMS/email + AI intro.
- First 10 leads captured and logged in Supabase/CRM; follow-ups scheduled.

Notes & audit trail

- Created/updated by Mini on 2026-02-26 per owner instruction. Replaces placeholder PROJECT.md.
- If you want me to expand any section (detailed ad targeting, exact ad copy variants, or a step-by-step FB create checklist), tell me and I will spawn Workhorse to generate the files.
