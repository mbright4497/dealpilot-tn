import * as fs from "fs";
import * as path from "path";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

function parseEnvFile(envPath: string): Record<string, string> {
  const text = fs.readFileSync(envPath, "utf8");
  const result: Record<string, string> = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^"(.*)"$/, "$1");
    result[key] = value;
  }

  return result;
}

function loadEnvFile(): { envPath: string; envValues: Record<string, string> } {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "web/.env.local"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(process.cwd(), "../web/.env.local"),
  ];

  let firstFound: { envPath: string; envValues: Record<string, string> } | null =
    null;

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      const envValues = parseEnvFile(envPath);
      const found = { envPath, envValues };

      if (!firstFound) {
        firstFound = found;
      }

      if (
        envValues.SUPABASE_SERVICE_ROLE_KEY &&
        (envValues.NEXT_PUBLIC_SUPABASE_URL || envValues.SUPABASE_URL)
      ) {
        return found;
      }
    }
  }

  if (firstFound) {
    return firstFound;
  }

  throw new Error(
    `Could not find .env.local. Checked: ${candidates.join(", ")}`
  );
}

async function main() {
  const { envPath, envValues } = loadEnvFile();
  const connectionString =
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    envValues.SUPABASE_DB_URL ??
    envValues.DATABASE_URL;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    envValues.NEXT_PUBLIC_SUPABASE_URL ??
    envValues.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? envValues.SUPABASE_SERVICE_ROLE_KEY;

  console.log("Loaded env from:", envPath);
  if (connectionString) {
    console.log("Connected via SUPABASE_DB_URL/DATABASE_URL");
    const client = new Client({ connectionString });
    await client.connect();
    console.log("");

    console.log("Query 1:");
    console.log(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'deals' AND table_schema = 'public' ORDER BY ordinal_position;"
    );
    const q1 = await client.query(`
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'deals'
AND table_schema = 'public'
ORDER BY ordinal_position;
`);
    console.log(JSON.stringify(q1.rows, null, 2));
    console.log("");

    console.log("Query 2:");
    console.log("SELECT * FROM deals LIMIT 3;");
    const q2 = await client.query(`
SELECT * FROM deals LIMIT 3;
`);
    console.log(JSON.stringify(q2.rows, null, 2));
    console.log("");

    console.log("Query 3:");
    console.log(
      "SELECT * FROM deals WHERE agent_id = '9397bcd6-eb70-40e1-9a71-b5aa2f64bf72' LIMIT 5;"
    );
    const q3 = await client.query(`
SELECT * FROM deals
WHERE agent_id = '9397bcd6-eb70-40e1-9a71-b5aa2f64bf72'
LIMIT 5;
`);
    console.log(JSON.stringify(q3.rows, null, 2));

    await client.end();
    return;
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing DB connection string and missing Supabase REST credentials."
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  console.log("Connected via Supabase REST API");
  console.log("");

  console.log("Query 1:");
  console.log(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'deals' AND table_schema = 'public' ORDER BY ordinal_position;"
  );
  const q1 = await supabase
    .schema("information_schema")
    .from("columns")
    .select("column_name, data_type")
    .eq("table_name", "deals")
    .eq("table_schema", "public")
    .order("ordinal_position", { ascending: true });
  if (q1.error) {
    throw new Error(`Query 1 error: ${q1.error.message}`);
  }
  console.log(JSON.stringify(q1.data, null, 2));
  console.log("");

  console.log("Query 2:");
  console.log("SELECT * FROM deals LIMIT 3;");
  const q2 = await supabase.from("deals").select("*").limit(3);
  if (q2.error) {
    throw new Error(`Query 2 error: ${q2.error.message}`);
  }
  console.log(JSON.stringify(q2.data, null, 2));
  console.log("");

  console.log("Query 3:");
  console.log(
    "SELECT * FROM deals WHERE agent_id = '9397bcd6-eb70-40e1-9a71-b5aa2f64bf72' LIMIT 5;"
  );
  const q3 = await supabase
    .from("deals")
    .select("*")
    .eq("agent_id", "9397bcd6-eb70-40e1-9a71-b5aa2f64bf72")
    .limit(5);
  if (q3.error) {
    throw new Error(`Query 3 error: ${q3.error.message}`);
  }
  console.log(JSON.stringify(q3.data, null, 2));
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
