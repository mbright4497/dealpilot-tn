GHL Actions & Trigger Snippets — Today’s Midday Nurture

1) Trigger: FB_Lead-Instant_SMS_Email
- When: Lead from Facebook ad form
- Action: Send instant SMS + email
- SMS one-liner: "Hey — Matt from iHome Team here. Thanks for your interest! Can we text a quick time to tour the home?"
- Email one-liner (subject): "Your New Construction Guide — Next Steps"
- Email snippet: "Thanks for reaching out — here’s your guide. Want to see quick-move-in homes this weekend? Reply and I’ll book it."

2) Trigger: GHL_AI_5min_Intro
- When: 5 minutes after lead capture
- Action: AI voice/text intro (5-min)
- SMS: "Quick intro from our AI assistant — I’ll send tailored homes in 60s. Want to see only under $350k? Reply YES."
- Email: "Here are homes matching your preferences — tell us which to tour."

3) Trigger: Followup_24hr_Push
- When: 24 hours after capture (no response)
- Action: SMS + email reminder
- SMS: "Still interested? A few quick-move-in homes just dropped in price. Want a tour?"
- Email: "Don’t miss these new-build options — schedule a weekend showing"

4) Trigger: Checkin_3day
- When: 3 days after capture
- Action: Personal agent check-in (task for Matt) + SMS
- SMS: "Matt here — any questions about the homes I sent? I can set up private tours this week."
- Task note: Call within 24 hours of trigger.

5) Trigger: Tag_By_Ad_Variation
- When: Lead captured
- Action: Apply tags: tag_ad_A, tag_ad_B, tag_ad_C (match FB ad variation)
- Use: Segment follow-ups and dynamic ad retargeting.

Quick implementation notes: Use exact trigger names above when creating workflows. Keep SMS <160 chars; emails should include the Free New Construction Guide link and a one-click "Schedule a Tour" button.