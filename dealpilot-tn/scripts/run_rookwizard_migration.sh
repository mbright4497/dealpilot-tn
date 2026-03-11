#!/usr/bin/env bash
set -euo pipefail

SQL_FILE="$(dirname "$0")/../supabase/migrations/20260311_add_rookwizard_transactions.sql"
if [ ! -f "$SQL_FILE" ]; then
  echo "Migration SQL not found: $SQL_FILE" >&2
  exit 1
fi

# Prefer SUPABASE_DB_URL (psql-compatible) if provided
if [ -n "${SUPABASE_DB_URL-}" ]; then
  echo "Running migration via psql using SUPABASE_DB_URL"
  psql "$SUPABASE_DB_URL" -f "$SQL_FILE"
  exit $?
fi

# Otherwise, if SUPABASE_SERVICE_ROLE_KEY is present, suggest curl command (requires Supabase SQL REST endpoint)
if [ -n "${SUPABASE_SERVICE_ROLE_KEY-}" ] && [ -n "${SUPABASE_URL-}" ]; then
  echo "SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL detected."
  echo "Note: This script does not attempt raw SQL execution via the Supabase HTTP admin API because endpoint availability varies by project/plan."
  echo "Below is a curl template you can run locally (replace placeholders if needed):"
  echo
  echo "curl '${SUPABASE_URL}/rest/v1/rpc/sql' \
  -H 'Content-Type: application/json' \
  -H 'apikey: ${SUPABASE_SERVICE_ROLE_KEY}' \
  -H 'Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}' \
  -d '{"sql": "$(sed -e 's/"/\\"/g' "$SQL_FILE" | tr -d "\n")" }'"
  echo
  echo "If your Supabase project exposes a specific SQL endpoint, adapt the above curl accordingly."
  exit 0
fi

# Fallback: instruct the user how to run the migration manually
cat <<'EOF'
No SUPABASE_DB_URL or SUPABASE_SERVICE_ROLE_KEY detected in the environment.

To run the migration, either:

1) Set SUPABASE_DB_URL to a psql-compatible connection string and run:
   export SUPABASE_DB_URL="postgres://user:pass@host:5432/dbname"
   ./dealpilot-tn/scripts/run_rookwizard_migration.sh

OR

2) If you prefer HTTP execution, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and run the curl template shown in the script.

EOF
exit 1
