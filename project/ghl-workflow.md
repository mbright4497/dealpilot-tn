GHL Workflow Spec — New Construction Lead Funnel

Trigger
- When a lead submits the Facebook lead form or the GHL landing page form for the New Construction Guide.
- Capture: name, phone, email, preferred area, budget, utm_source, utm_content (variation tag)

Steps
1) Immediate actions (on lead creation)
   - Tag: source=facebook, ad_variation={{utm_content}} or mapped value A/B/C
   - Send SMS (instant): "Thanks {{firstName}}! Your Free New Construction Guide is here: {{guide_link}}. Reva (our AI assistant) will text you shortly to help find listings. Reply HELP for support."
   - Send Email (instant): Subject: Your Free New Construction Guide — Tri-Cities
     Body: Short thank-you, attachment/link to {{guide_link}}, CTA to reply or schedule a call.

2) 5 minutes after lead
   - Send AI Intro (SMS): Short automated message from Reva: "Hi {{firstName}} — I’m Reva. Tell me your must-haves (beds, budget, area) and I’ll find new builds that match."
   - Optionally run an initial AI message via API to summarize lead preferences and suggest matches; store summary on lead record.

3) 24 hours after lead
   - Follow-up SMS: "Quick check-in — did you find anything you like? I can pull new builds in {{preferred_area}} right now."
   - Follow-up Email: More detailed list of nearby new builders, top price ranges, and link to schedule a call.

4) 3 days after lead
   - Check-in SMS/Email: Nudge with social proof/testimonial + CTA to schedule a call or request new listings.

Tagging & Routing
- Tag by ad variation: ad_variation:A / ad_variation:B / ad_variation:C
- Add owner/assignment rule: assign to iHome Team agent pool or default agent
- Add lead score: +10 for reply to SMS / +5 for click on guide link

Testing & QA
- Create test lead via GHL form with utm_content=variationA and confirm:
  - Tags applied correctly
  - Immediate SMS + Email send with {{guide_link}} replaced
  - 5-min AI intro fires (use test phone/email)
  - Lead appears in pipeline and is assigned correctly

Notes
- Ensure SMS content complies with TCPA rules; use opt-out info if required.
- Keep messages concise; use personal first name tokens.
- Maintain a 20/day budget tracking and pause automation if CPL > target after test window.

Deliverables
- Implement workflow in GHL, set delays as above, map form fields to lead fields, and enable tags by ad variation.