# BOOTSTRAP.md

Purpose

This file documents bootstrap steps and essential setup for the HubLinkPro / DealPilot workspace. Use this as the canonical quick-start for a developer or operator to get the project running locally and understand key services.

Prerequisites

- Node 18+ and npm installed
- Git configured with access to the repo
- Supabase project and credentials (URL + anon/public key) for local dev or a .env file with SUPABASE_URL and SUPABASE_ANON_KEY
- Vercel account for production deployment (optional for local dev)
- Brave Search API key (optional but required for market intel automation)

Quick local bootstrap

1. Clone the repo (if not already):
   git clone git@github.com:mbright4497/dealpilot-tn.git
   cd dealpilot-tn/web

2. Install dependencies:
   npm install

3. Setup environment variables:
   - Create a .env.local in dealpilot-tn/web with at minimum:
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     NEXT_PUBLIC_BRAVE_API_KEY=your-brave-api-key (optional)
     NODE_ENV=development

4. Run local dev server:
   npm run dev

5. Build for production (used by CI):
   npm run build

6. Deploy to Vercel: connect repo to Vercel and set the above env vars in the Vercel project settings.

Notes & troubleshooting

- If build fails due to missing packages (e.g., react-dropzone), run npm install <package> in the web directory and re-run the build.
- If Supabase auth helpers fail, confirm NEXT_PUBLIC_SUPABASE_* env vars are correct and that the Supabase project has the expected tables: deals, deal_documents, compliance_checks, deadlines.
- For deadlines generation: confirm /api/deadlines/generate exists and that the function accepts binding_agreement_date and inspection_date fields.

Useful commands

- Local build: cd dealpilot-tn/web && npm run build
- Run tests (if present): npm test
- Linting: npm run lint

Ownership

- Owner: Matt (iHome Team)
- Maintainer: Mini (agent) — contact via workspace notes

Change log

- 2026-02-26: Placeholder created and expanded by Mini.
