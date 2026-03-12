2026-03-12

- Renamed UI assistant references from Eva -> Reva across chat component and intake flows.
- Implemented AIChatbot to fetch live deal data (/api/transactions, /api/deal-state, /api/deadlines) and post to /api/ai.
- Added /api/contract-watch route and ContractWatch component to surface next 5 milestones.
- Persisted parsed contract intake to localStorage and surfaced pending parsed deals on dashboard with confirm/create flow.
- Updated transaction list to display real closing dates and calculated days-to-close.
- Added placeholder pages for AI, Transactions, Deadlines to avoid 404s.
- Performed cleanup audit for old Supabase client usage (no migrations required in web/src/app/api).
- Committed and pushed all changes to main.

Actions to follow up:
- Verify TTS/voice engine integration is exactly the same as production (HeyGen or custom) — currently using browser speechSynthesis fallback; can integrate exact engine given the code or API.
- Run a Next.js build in CI to confirm no runtime import errors.
- Review any remaining "Eva" references outside web/src and dealpilot-tn paths and rename if desired.
