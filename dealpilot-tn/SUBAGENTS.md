# Subagent Registry

This registry maps numeric sub-agent IDs to names, responsibilities, runtimes, and owners. Use this as the canonical mapping for Mission Control and orchestration.

Format:
- id: numeric string
- slug: short-slug
- name: human friendly
- role: manager|worker|orchestrator
- description: brief responsibility
- owner: person or agent
- runtime: node|container|gpu
- notes: additional info

---

- id: "000"
  slug: orchestrator
  name: Orchestrator
  role: orchestrator
  description: "Overall orchestrator - coordinates managers and high-level decisions. Primary owner: Matt (Tango)."
  owner: Matt / mini
  runtime: node
  notes: "Do not auto-restart. Highest privilege agent."

- id: "100"
  slug: ui-manager
  name: UI Manager
  role: manager
  description: "Coordinates UI/component refactors, feature branches, PRs, and design tokens."
  owner: mini
  runtime: node
  notes: "Claims UI tasks, runs local builds, opens PRs."

- id: "110"
  slug: ui-refactor
  name: UI Refactor Worker
  role: worker
  description: "Performs component extraction & integration tasks (TransactionDetail UI)."
  owner: mini
  runtime: node
  notes: "Runs `npx next build` and reports results."

- id: "200"
  slug: build-worker
  name: Build Worker
  role: worker
  description: "Runs builds (npx next build), compiles, reports logs and artifacts."
  owner: mini
  runtime: node
  notes: "Retries on transient failures; uploads logs to /tmp or artifact store."

- id: "300"
  slug: docs-worker
  name: Document Worker
  role: worker
  description: "OCR, classification, and document extraction for deals."
  owner: mini
  runtime: container
  notes: "Optional GPU for heavy extraction."

- id: "400"
  slug: qa-runner
  name: QA Runner
  role: worker
  description: "Runs unit/integration tests and reports failures."
  owner: mini
  runtime: node
  notes: "Reports coverage and failing tests to Mission Control."

- id: "500"
  slug: deploy-agent
  name: Deploy Agent
  role: worker
  description: "Handles pushes to main and triggering Vercel deploys."
  owner: mini
  runtime: node
  notes: "Requires GitHub and Vercel tokens stored in secrets."

- id: "900"
  slug: gpu-worker
  name: GPU Worker
  role: worker
  description: "NVIDIA GPU tasks: image generation, heavy inference (optional)."
  owner: mini
  runtime: gpu
  notes: "Requires CUDA drivers and provisioned GPU."


---

How to use

- Reference agents by numeric id in notebooks, Comet, and Mission Control.
- Use the Mission Control UI to spawn, stop, or inspect agent state.
- Keep this file up to date when adding or removing agents.
