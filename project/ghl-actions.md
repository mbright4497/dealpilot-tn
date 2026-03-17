# GoHighLevel Actions — 2026-03-17 Midday Lead Nurture

## 1. Final-spec alert (D.R. Horton Johnson City + Kingsport)
- **Trigger:** Manually tag leads that requested under-$360K new construction today with `Tag: MIDDAY_LEAD_NURTURE` + `Tag: SPEC_ALERT` after confirming they can tour within 7 days.
- **Sequence:** Immediately fire SMS & email templates, then queue a call/text reminder for 24 hours later if no reply.
- **SMS template:** “Final specs still available at Archer’s Pointe, Beechwood or Kingsport towns. Reply YES and we’ll book a builder tour before they go under contract.”
- **Email template subject:** “Last call for DR Horton specs—call us to hold one now.” Body: include price points, community names, CTA to text or schedule a walkthrough.
- **Testing steps:** Apply tags to test contact “Midday QA”; trigger sequence; confirm SMS arrives in <1 min and email renders with CTA link (ask QA to respond YES and ensure follow-up task appears).

## 2. Fieldcrest + Arbor priority follow-up
- **Trigger:** Lead opens any new construction email today and clicks a Kingsport community link OR responds to the TRI-SPEC keyword via SMS.
- **Actions:** Tag `Tag: KINGS_PORTFOLIO`; send second SMS with Polo Fields/Arbor Townhomes highlights + mention Fieldcrest Acres backup; create agent task to call within 90 minutes and note price band ($250K–$332K).
- **Templates:** SMS copy = “Polo Fields & The Arbor: still in stock today from $250K–$332K. Want me to run the builder dashboard and hold a lot for this afternoon?”
- **Testing:** Use QA lead to click the link + send keyword; verify tags attach, SMS dispatch, and task is created for the assigned agent.

## 3. Builder outreach reminder (Lennar / Smith Douglas / Ryan Homes)
- **Trigger:** Tag a warm lead with `Tag: TRI_BUILDER_CHECKIN` after noting the blocked portals; run the automation so reps know to source inventory via rep calls.
- **Sequence:** Send an internal SMS/email to the buyer agent with the note “Builder portals gated; call Lennar/Smith Douglas/Ryan Homes for the hottest inventory before noon tomorrow.” Include CTA to log rep feedback in the lead timeline.
- **Testing:** Create internal test lead with `TRI_BUILDER_CHECKIN` and confirm the reminder message posts in the agent’s chat and a follow-up task is scheduled for next morning.

## 4. Afternoon social CTA follow-up
- **Trigger:** Lead replies to the social post or website form with “TRI-SPEC.”
- **Actions:** Tag `Tag: SOCIAL_TRI_SPEC`, send automated SMS + email pointing to the same hero communities (Archer’s Pointe, Arbor, Fieldcrest), and assign a task to text with available nearby tour windows.
- **Testing:** Submit test form + keyword; verify tags, SMS, email, and task creation succeed, and the task contains the CTA from the post (“Hold Arbor Townhomes for me”).
