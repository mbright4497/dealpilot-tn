DealPilot TN

Quick start

1. Install
   npm install

2. Test
   npm test

3. Build
   npm run build

4. Run
   npm start

Environment variables
- SUPABASE_URL: Supabase URL
- SUPABASE_ANON_KEY: Supabase anon key
- SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
- GHL_API_KEY: GoHighLevel API key
- GHL_LOCATION_ID: GoHighLevel location id
- WHATSAPP_TOKEN: WhatsApp bearer token
- WHATSAPP_PHONE_NUMBER_ID: WhatsApp phone number id
- WHATSAPP_VERIFY_TOKEN: WhatsApp webhook verify token
- WHATSAPP_APP_SECRET: WhatsApp app secret

Docker

  docker build -t dealpilot .
  docker-compose up -d

Migrations

Use the provided SQL files in dealpilot-tn/supabase/migrations to apply schema to Supabase.

API Endpoints

- GET /health
- POST /api/deals
- GET /api/deals/:id
- PUT /api/deals/:id/advance
- GET /api/deals/:id/audit
- GET /api/deals/:id/timeline
- GET /api/deals/:id/forms
- POST /api/offers/score
- POST /api/offers/compare
- POST /api/offers/draft
- Voice endpoints under /api/voice
- WhatsApp webhook: /whatsapp

Architecture

Modules: form-engine, timeline-engine, offer-scoring, notification-engine, crm-integration, voice pipeline, express API
