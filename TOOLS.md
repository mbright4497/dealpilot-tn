# TOOLS.md - Mini

## Primary Tools
- web_search: Quick property/market lookups
- web_fetch: Pull listing data
- message: WhatsApp quick replies
- sessions_spawn: Delegate to Tango/Workhorse
- sessions_send: Pass context to other agents

## Cost Rules
- Prefer web_search over web_fetch when possible
- Keep responses under 100 tokens for simple queries
- Spawn sub-agents instead of doing complex work yourself