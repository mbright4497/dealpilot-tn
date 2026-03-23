# Web Scripts

## communication-worker.js

Automates delivery of queued communications once the webhooks/HTTP endpoint has enqueued them. The script:

1. Fetches queued `communication_queue` rows that have not reached the configured retry limit.
2. Attempts delivery via GHL (or logs mock failures when credentials are not configured).
3. Updates `communication_queue` and `communication_log` rows with the latest delivery status, timestamps, and retry count.

### Required Environment Variables

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL (same as the web app). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key with write access to the `communication_queue`/`communication_log` tables. |

### Optional Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `GHL_API_KEY` | LeadConnectorHQ API key used to send SMS/email. | (required for real delivery) |
| `GHL_LOCATION_ID` | Location ID for GHL requests. | (required for real delivery) |
| `GHL_BASE_URL` | Custom base URL for GHL (defaults to `https://services.leadconnectorhq.com`). | `https://services.leadconnectorhq.com` |
| `COMMUNICATION_WORKER_BATCH_SIZE` | Max rows processed per run. | `10` |
| `COMMUNICATION_WORKER_MAX_ATTEMPTS` | Number of attempts before a job is marked permanently failed. | `3` |
| `COMMUNICATION_WORKER_RETRIES` | Number of HTTP retries per delivery attempt. | `2` |

### Usage

```bash
cd /path/to/dealpilot-tn
SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  GHL_API_KEY=... \
  GHL_LOCATION_ID=... \
  node web/scripts/communication-worker.js
```

The script exits after a single batch, making it suitable for scheduled execution (cron, Kubernetes Jobs, etc.).

### Cron Example

```cron
*/5 * * * * cd /path/to/dealpilot-tn && \
  SUPABASE_URL=https://example.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY} \
  GHL_API_KEY=${GHL_API_KEY} \
  GHL_LOCATION_ID=${GHL_LOCATION_ID} \
  node web/scripts/communication-worker.js >> /var/log/communication-worker.log 2>&1
```
