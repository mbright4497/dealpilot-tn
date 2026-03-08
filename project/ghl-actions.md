GHL Actions — Suggested automations for 2026-03-08 (Midday)

1) New Lead (FB Lead Form / Landing Page) -> Immediate sequence
   - Trigger: New lead tag=fb_newbuild
   - Actions:
     - Send SMS: Welcome + link to "New Construction Guide" (instant)
     - Send Email: Guide + 1-click scheduler (instant)
     - Add to Tag: lead_source:fb_ad_variation
     - Wait 5 minutes -> Send AI intro SMS (short)
     - Create Task: Assign to agent (Matt) if lead score >= warm

2) Price Drop Alert -> Buyer Nudge
   - Trigger: Listing tag=price_drop_newbuild OR manual trigger from team
   - Actions:
     - Send SMS to buyers tagged interested_in_new_builds under $400K
     - Send Broadcast email to segment: "Price Drop Alerts"
     - Notify Slack/WhatsApp: listing + link + recommended outreach

3) Open House / New Community Launch
   - Trigger: Event created in project/calendar with tag=open_house
   - Actions:
     - Email sequence to local buyers (72h, 24h, 2h reminders)
     - Facebook event boosted post reminder
     - Add attendees to follow-up workflow (post-event nurture)

4) Lender Rate Update
   - Trigger: Manual trigger by marketing when lenders report new offers
   - Actions:
     - Send email to all leads with tag:mortgage_interested
     - Create task for lender partner to call hot leads

5) Re-Engage Cold Leads (30+ days inactive)
   - Trigger: Lead inactivity >30 days
   - Actions:
     - 3-part SMS/email drip with new inventory highlights
     - If opens/clicks -> escalate to agent for call

Notes:
- Ensure tags used in ad variations map to GHL fields for tracking
- Use lead scoring to surface "warm" leads for immediate calls
- Add short-lived UTM params to ad links for easier attribution

Owner: Mini
Last updated: 2026-03-08 16:12 ET
