# GHL Actions — Follow-up Sequences & Templates (Fire today)

Note: automated web_search failed (Brave API key missing). Workhorse should run a GHL export and MLS pull to fill any placeholders (e.g., budget thresholds, neighborhood tags).

Overview:
- Trigger: New lead captured from Facebook lead ad or landing page form
- Immediate actions (within 1 minute): assign tag, send SMS + email, enqueue 5-min AI intro sequence
- Follow-up cadence: 5-min AI intro → 24-hour email/SMS → 3-day check-in → 7-day nurture (if not HOT)
- HOT lead rules: tag + notify agent when (a) lead marks "Ready to build" OR (b) budget >= $400K (adjust after MLS pull)

Tagging rules:
- tag:ad_variation_A | ad_variation_B | ad_variation_C (set at form submission)
- tag:neighborhood_<name> (set by form choice or landing-page parameter)
- tag:lead_source:facebook | lead_source:landing_page
- tag:hot_lead (set by qualifying answers or lead score)

Immediate SMS (send within 1 minute):
- From: iHome Team (Matt)
- Message:
Hi {first_name}! Thanks for requesting the New Construction Guide. I’m Matt — I’ll send the guide now. Want quick answers about budgets, move-in dates, or builder incentives? Reply with "ASK" and our AI will get you answers in 60s.

Immediate Email (send within 1 minute):
- Subject: Here’s your New Construction Guide — + quick AI help
- Body:
Hi {first_name},

Thanks for your interest — attached is the New Construction Guide for Tri-Cities. Reply to this email or click the button below to get a 1‑minute AI walkthrough of local builders and move-in ready homes.

[Button: Get 1-Minute AI Tour]

— Matt, iHome Team

5-Min AI Intro (automated chat / SMS follow-up):
- Trigger: 5 minutes after lead capture (if no reply)
- SMS Template:
Hey {first_name}, Matt here. Quick 60s check — are you: 1) Looking to move in <3 months, 2) Building within 3-6 months, or 3) Just researching? Reply 1, 2, or 3 and I’ll send tailored options.
- Action: route reply into AI chat flow; if reply indicates 1 or Ready-to-build, add tag:hot_lead and notify agent.

24-Hour Follow-up (email + SMS):
- Email Subject: Still Shopping? New builds & incentives you should see
- Email Body:
Hi {first_name},

Quick update — builders in {neighborhood} currently offering closing-cost help and lot credits for select plans. Want me to check move-in ready homes that fit {budget_range}? Click below.

[Button: Show Me Move-In Ready Homes]

— Matt

- SMS:
Hi {first_name}, saw you were interested in new builds near {neighborhood}. Want me to pull move-in ready homes under {budget_range}? Reply YES.

3-Day Check-in (SMS):
- SMS Template:
Hi {first_name}, Matt again. Any questions about building timeline, upgrades, or incentives? I can set up tours this week if you’re ready.

HOT Lead Notification (agent alert):
- Trigger: tag:hot_lead OR lead answer indicates Ready-to-build OR budget >= {budget_threshold}
- Action: send internal SMS + email to Matt; create GHL task "Call HOT lead" with 30-min SLA.
- Internal alert message:
HOT lead: {first_name} {last_name} — {phone} — Budget: {budget} — Ready-to-build: {yes/no} — {lead_source}. Call now.

Agent Call Task (automated):
- Create task when: tag:hot_lead OR budget >= {budget_threshold}
- Task details:
Title: Call HOT lead — {first_name} {last_name}
Due: within 30 minutes
Notes: Confirm budget, timeline, builder preference, and willingness to schedule lot visits. Use script: Are you pre-approved? Timeline? Must-haves?

Nurture (if not HOT after 7 days):
- Weekly email with new move-in ready listings and mortgage rate tips
- Retarget via FB custom audience for 30 days

Templates / Placeholders to fill:
- {budget_threshold} — suggested default $400,000 (adjust after MLS pull)
- {neighborhood} — set from landing page param or lead form
- {budget_range} — use lead's stated budget or ad audience default

Workhorse Actions:
- Run GHL export and MLS pull to confirm appropriate budget_threshold and neighborhood tags; update templates with local price points and insert listing links into the 24-hour email/button.
- Turn on tracking: set ad_variation tags and test end-to-end with a sandbox lead.

Generated: SUBAGENT — actionable GHL sequences ready to deploy after live-data fill.
