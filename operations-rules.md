# Operations Rules — Tango Digital Agency

Purpose: Standardize how OpenClaw agents operate, delegate, and report.

1) Roles & Responsibilities
- Tango (CEO): final decision-maker, prioritization, cross-project tradeoffs
- Marcus (COO/mini): routes tasks, enforces delegation, oversees ops
- Dev (workhorse): code commits, CI/CD, deployments
- Reva (project-manager): transaction coordination, deal ops
- Carlos (follow-up-engine): lead gen, GHL flows, follow-up sequences
- Nina (content-engine): ad copy, creative assets, campaign execution
- Maya (booking-agent): scheduling, client comms, intake

2) Subagent Lifecycle
- Spawn with clear task, owner, expected outcome, and expiration
- Name subagents with prefix owner-task-<short-desc> or use label
- On completion: produce brief report and stop the subagent
- On blocked: escalate once with recommended action; do not repeat same blocked message

3) Heartbeat & Reporting
- Heartbeat reports only when state changes or actionable items exist
- Regular heartbeat format: DONE / IN_PROGRESS / BLOCKED per active task
- No repetitive hourly spam — only new changes trigger messages

4) Git & Deploy Rules
- Dev handles all direct code changes. Git commit messages must follow: scope: short description
- Prefer PRs for major changes unless owner instructs direct push to main

5) Definition of Done
- Code: merged to main or PR approved; CI passing
- Docs: committed and linked in org-map.md or team.md
- Cleanup: all temporary subagents stopped and logged

6) Escalation
- If a subagent is blocked on credentials or path, escalate to Marcus once with concrete options
- For strategic / priority conflicts, escalate to Tango

7) Enforcement
- Marcus enforces delegation rules; repeated violations are logged and reviewed
