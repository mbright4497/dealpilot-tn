import { readFile } from "node:fs/promises";
import path from "node:path";

const MIGRATION_SQL = `
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS assistant_style TEXT DEFAULT 'friendly_tn',
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;
`.trim();

async function loadEnvLocal(): Promise<string> {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "web", ".env.local"),
    path.join(cwd, "..", "web", ".env.local"),
  ];

  for (const envPath of candidates) {
    try {
      const raw = await readFile(envPath, "utf8");
      const parsed: Record<string, string> = {};
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx < 0) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        parsed[key] = value;
      }
      const hasRequired =
        typeof parsed.NEXT_PUBLIC_SUPABASE_URL === "string" &&
        parsed.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
        typeof parsed.SUPABASE_SERVICE_ROLE_KEY === "string" &&
        parsed.SUPABASE_SERVICE_ROLE_KEY.length > 0;

      if (!hasRequired) continue;

      for (const [key, value] of Object.entries(parsed)) {
        if (!(key in process.env)) process.env[key] = value;
      }
      return envPath;
    } catch {
      // Try next candidate
    }
  }

  throw new Error(
    "Could not find web/.env.local containing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
}

async function runSqlViaRpc(baseUrl: string, serviceRoleKey: string): Promise<{ rpc: string; response: unknown }> {
  const rpcCandidates = ["exec_sql", "run_sql", "query"];
  let lastError: unknown = null;

  for (const rpcName of rpcCandidates) {
    const endpoint = `${baseUrl}/rest/v1/rpc/${rpcName}`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({ sql: MIGRATION_SQL }),
      });

      const text = await res.text();
      const parsed = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const errObj = parsed ?? { status: res.status, body: text };
        throw new Error(`${rpcName} failed (${res.status}): ${JSON.stringify(errObj)}`);
      }
      return { rpc: rpcName, response: parsed };
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `All RPC attempts failed (tried: ${rpcCandidates.join(", ")}). Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

async function main(): Promise<void> {
  const loadedPath = await loadEnvLocal();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in web/.env.local");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in web/.env.local");

  console.log(`Loaded env from: ${loadedPath}`);
  console.log(`Connecting to Supabase project: ${baseUrl}`);
  console.log("Running migration SQL...");

  const result = await runSqlViaRpc(baseUrl, serviceRoleKey);
  console.log(`Migration executed successfully via rpc('${result.rpc}').`);
  console.log("RPC response:", JSON.stringify(result.response));
}

main().catch((err) => {
  console.error("Migration failed:");
  console.error(err);
  process.exit(1);
});
