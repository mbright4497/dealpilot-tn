#!/usr/bin/env node
// run_migrations.js
// Usage: node run_migrations.js
// This script reads environment variables from dealpilot-tn/.env or process.env and applies
// SQL files in supabase/migrations and supabase/seeds to the target Postgres database.
// It requires a direct Postgres connection string in SUPABASE_DB_URL (recommended) or
// SUPABASE_SERVICE_ROLE_KEY + SUPABASE_URL to be present. The service role key alone is
// insufficient to build a connection string; please provide SUPABASE_DB_URL from the
// Supabase dashboard (Database > Connection string) or the full DATABASE_URL.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const out = {};
  for (const l of lines) {
    const m = l.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (m) {
      let val = m[2] || '';
      // strip optional quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[m[1]] = val;
    }
  }
  return out;
}

(async () => {
  try {
    const repoRoot = path.resolve(__dirname, '..');
    const envPath = path.join(repoRoot, '.env');
    const env = loadEnv(envPath);
    const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL || env.DATABASE_URL;

    if (!SUPABASE_DB_URL) {
      console.error('\nERROR: SUPABASE_DB_URL (or DATABASE_URL) not found in environment or dealpilot-tn/.env.');
      console.error('Please add SUPABASE_DB_URL to dealpilot-tn/.env with your Supabase Postgres connection string (this is the preferred, secure way).');
      console.error('Alternatively, provide SUPABASE_DB_URL as an environment variable when running the script.');
      process.exit(2);
    }

    console.log('Connecting to Postgres...');
    const client = new Client({ connectionString: SUPABASE_DB_URL });
    await client.connect();

    const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');
    const seedsDir = path.join(repoRoot, 'supabase', 'seeds');

    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const f of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
        console.log('\n--- Applying migration:', f);
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('COMMIT');
          console.log('Applied', f);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error('Failed migration', f);
          throw err;
        }
      }
    } else {
      console.log('No migrations directory at', migrationsDir);
    }

    if (fs.existsSync(seedsDir)) {
      const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();
      for (const f of files) {
        const sql = fs.readFileSync(path.join(seedsDir, f), 'utf8');
        console.log('\n--- Applying seed:', f);
        try {
          await client.query(sql);
          console.log('Applied seed', f);
        } catch (err) {
          console.error('Failed seed', f);
          throw err;
        }
      }
    } else {
      console.log('No seeds directory at', seedsDir);
    }

    await client.end();
    console.log('\nAll migrations and seeds applied successfully.');
  } catch (err) {
    console.error('\nERROR during migration run:', err);
    process.exit(1);
  }
})();
