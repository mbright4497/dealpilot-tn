GHL Actions — Midday Lead Nurture (2026-03-10)

Immediate Triggers to Fire Today

1) Trigger name: "FB Ad — NewBuild_Under400K_LEAD"
- When: Lead submits FB lead form or clicks landing page and converts
- Tags to apply: ad_variation:A (New construction $250K+), source:facebook
- Instant SMS (0-1 min): "Hey {firstName}, Matt here with iHome Team — thanks for your interest in new construction. Grab our free New Construction Guide: [short link]. Reply 'TOUR' to schedule a showing."
- Instant Email (0-1 min): Subject: "Your New Construction Guide — Tri-Cities" Body: "Hi {firstName}, thanks for reaching out. Here's your guide to new builds in Johnson City, Kingsport & Bristol. If you'd like, reply and I can set up a quick AI tour or call. — Matt"
- 5-min automated: send AI intro message: "Want instant answers about a floorplan, incentives, or move-in dates? Reply here — our AI assistant can pull live builder data."

2) Trigger name: "FB Ad — FirstTimeBuyer_LEAD"
- Tags: ad_variation:C (First-time buyer), source:facebook, lifecycle:first-time-buyer
- SMS: "Congrats on starting the home search! Text STOP to opt-out. Want help comparing warranty options for new builds? Reply 'WARRANTY'"
- Email snippet: "3 reasons new construction might be smarter for first-time buyers — free guide inside."

3) Trigger name: "Organic_Web_LP_NewBuild"
- Tags: source:landing-page, ad_variation:organic
- Action: Add to nurture sequence (see below)

Nurture Sequence (for all new-build leads)
- Step 0 (Immediate): Send guide SMS + email (above)
- Step 1 (5 min): AI intro message (chat link to AI assistant in GHL)
- Step 2 (24 hours): Follow-up SMS: "Hi {firstName}, checking in — any floorplans you'd like details on? We can set up a builder call or tour. — Matt"
- Step 3 (3 days): Email: "Top 5 new builds under $400K right now (updated)" — populate with live listings when web access available
- Step 4 (7 days): SMS drip: value + testimonial + CTA to schedule tour

Tags and Ad Variation Mapping (apply when lead first created)
- ad_variation:A -> tag: ad:A_newbuild250-400
- ad_variation:B -> tag: ad:B_zillow-alternative
- ad_variation:C -> tag: ad:C_firsttime

Message Templates (copy-paste ready)
- SMS (Guide delivery): "Hey {firstName}, Matt here — your New Construction Guide is ready. Download: [shortlink]. Reply 'CHAT' to ask our AI assistant about move-in dates or incentives."
- Email (Guide delivery): Subject: "New Construction Guide — Tri-Cities" Body: "Hi {firstName},
Thanks for your interest. Download your free New Construction Guide here: [shortlink]. Reply to this email if you want a personalized list of move-in ready homes under $400K. — Matt"

Testing Steps (quick verification)
1) Create a test lead via FB lead gen form or manually create a contact in GHL with tag ad_variation:A and source:facebook.
2) Verify instant SMS is sent and contains the shortlink.
3) Confirm the contact receives the immediate email and is added to the nurture sequence.
4) Check that tags applied correctly (ad_variation:X and source).
5) Fast-forward (manually trigger) the 5-min AI intro message to ensure chat link resolves.

TODOs (require live web data)
- Populate the Step 3 (3 days) email with current live listings — run web_search: "Tri-Cities new construction homes under 400k Realtor.com" and collect 4-5 listing links + builder contact numbers.
- Fill message placeholders [shortlink] with actual GHL landing page / guide URL.

Notes: Keep tags consistent for reporting. Use ad_variation tag in all follow-ups so we can A/B performance by creative.