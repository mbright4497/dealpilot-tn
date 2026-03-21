# GHL Actions — Midday Lead Nurture (12:00–14:00 Window)
*These sequences should be live today for any new builder leads. Adjust lead tags and delays based on the latest queue exports (GHL login required).* 

## 1. Trigger: "New Construction Form — Midday"
- **Condition:** Lead submits builder form between 11:30 AM and 12:30 PM (DR Horton, Lennar, Smith Douglas, Ryan Homes keywords)
- **Tag:** `New-Lead-Midday`
- **Delay:** Immediate (0–1 minute)
- **Action:** Send SMS, add to agent queue, drop into Builder Highlights SMS template.
- **Sample SMS:** "Hey {{first_name}}, it’s Matt with the iHome Team—just saw your new construction inquiry. I can share today’s best move-in-ready homes under $325K. Want me to book a quick 15-min call?"
- **Sample Email:** "Subject: Quick follow-up on your builder search
  Hi {{first_name}}, thanks for checking out new construction in the Tri-Cities. I have today’s list of quick move-ins from DR Horton, Lennar, and Ryan Homes that match a $200K–$325K budget. Let me know which community you’d like to tour and I’ll get a showing on the books before the weekend. — Matt"

## 2. Trigger: "Builder Card Click — Beechwood / Archer’s Pointe"
- **Condition:** Lead clicks Beechwood Meadows or Archer’s Pointe link (Zap/Webhooks capturing trackable URL)
- **Tag:** `Builder-Click-Beechwood`
- **Delay:** 3 minutes (after link engagement)
- **Action:** Send second SMS with appointment options, assign to Builder Specialist, add to `Builder Tour Queue`.
- **Sample SMS:** "The speculative homes at Beechwood Meadows are showing strong interest—want to grab the last 5:30 PM or 6:00 PM slot today?"

## 3. Trigger: "Price/Incentive Keyword Reply"
- **Condition:** Lead replies with keywords "price", "incentive", or "closing"
- **Tag:** `Midday-Price-Focus`
- **Delay:** 4 minutes (AI replies then agent follow-up)
- **Action:** Send carousel email with price drop summary and push to `Price Drop Alert` SMS.
- **Sample SMS:** "We just loaded a $10K incentive stack at Willow Springs + DR Horton—want me to reserve the first showing?"
- **Sample Email:** "Subject: Builder price update—limited-time credits
  Hey {{first_name}}, I’ve summarized the latest price drops under $325K (Beechwood Meadows, Polo Fields, Willow Springs) with incentive stacks that expire this week. Reply with a day/time and I’ll reserve a showing with the builder’s rep."

## 4. Trigger: "New Listing Flag — Builder Quick Move-In"
- **Condition:** New listing added to MLS/builder feed that matches sub-$400K move-in ready criteria (manual update required)
- **Tag:** `Builder-New-Listing`
- **Delay:** 10 minutes (after internal review)
- **Action:** Send midday boost SMS to `New-Lead-Midday`, update Facebook/Instagram Creative with new listing image, and notify team via Slack or pipeline check.

## 5. Trigger: "Midday Callback Reminder"
- **Condition:** Lead tagged `Builder-Callback-Midday` with pending follow-up
- **Delay:** 15 minutes after tag is added (keeps momentum while the lead is warm)
- **Action:** Schedule agent callback, log note, send prep SMS.
- **Sample SMS:** "Heading into the afternoon—this is Matt Bright checking in to confirm your builder call window. Can we lock in 2:00 PM to walk through the quick move-in options?"

*Reminder:* After copying these triggers into GHL, add the tag names exactly as spelled above so the automations can reference the same sequences across SMS, email, and workflows.
