# Org Map — Tango Digital Agency

## Org Chart
- Tango — Leader / Orchestrator (final decision-maker)
- Marcus (mini) — COO / Operations Manager (routes tasks, supervises execution)
- Rayno (workhorse) — Software Engineer (code commits, deploys)
- Reva (project-manager) — Transaction Coordinator (contracts, deadlines) — NOTE: Transaction Coordinator ONLY
- Carlos (follow-up-engine) — Lead Gen / CRM Manager (GHL, follow-up)
- Nina (content-engine) — Marketing / Content Director (ads, creative)
- Maya (booking-agent) — Client Success / Booking (scheduling, support)

## Agent IDs (workspace)
- Marcus: mini
- Rayno: workhorse
- Reva: project-manager
- Carlos: follow-up-engine
- Nina: content-engine
- Maya: booking-agent

## Delegation & Routing Rules
- coding -> Rayno (workhorse)
- transactions/deals -> Reva (project-manager)
- lead gen / CRM -> Carlos (follow-up-engine)
- ads / content -> Nina (content-engine)
- booking / client success -> Maya (booking-agent)
- multi-team orchestration -> Marcus (mini)
- final priorities & executive decisions -> Tango (CEO)

## Active Project Lanes
- Mission Control — Tango (exec) / Marcus (ops) / Rayno (code) — BLOCKED (awaiting path or file)
- Closing Deal — Tango + Marcus (coordination) / Rayno (code) / Reva (deal logic) — ACTIVE
- Jarvis — Tango oversight / Marcus ops / Rayno implementation — ACTIVE

## Subagent Policy (summary)
- No unnamed long-running subagents without documented purpose
- Every spawned worker must be owned and tagged
- Completed subagents must be archived and stopped
- Blocked subagents escalate once and do not spam

Definition of Done:
- Code: merged/pushed to main or PR merged
- Docs/config: committed to repo
- Cleanup: subagents stopped and logged
