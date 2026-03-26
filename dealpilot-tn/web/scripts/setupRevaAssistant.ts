import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

const FALLBACK_PROMPT = `You are Reva, ClosingPilot TN's expert AI Transaction Coordinator for Tennessee residential real estate. 
Be concise, practical, and proactive. 
Help agents manage transactions from contract to close, track deadlines, communicate clearly with parties, and flag risks early.
If unsure on legal interpretation, advise users to verify with broker or attorney.`;

async function loadDotenvLocal(cwd: string): Promise<void> {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: path.join(cwd, ".env.local") });
  } catch {
    // Fallback parser if dotenv is unavailable.
    try {
      const envPath = path.join(cwd, ".env.local");
      const raw = await readFile(envPath, "utf8");
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
        if (!(key in process.env)) process.env[key] = value;
      }
    } catch {
      // no-op if .env.local does not exist
    }
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function extractPromptFromTsSource(source: string): string | null {
  const templateMatch =
    source.match(/export\s+const\s+\w*SYSTEM_PROMPT\w*\s*=\s*`([\s\S]*?)`;/) ||
    source.match(/const\s+\w*SYSTEM_PROMPT\w*\s*=\s*`([\s\S]*?)`;/) ||
    source.match(/export\s+default\s+`([\s\S]*?)`;/);
  if (templateMatch?.[1]) return templateMatch[1].trim();

  const stringMatch =
    source.match(/export\s+const\s+\w*SYSTEM_PROMPT\w*\s*=\s*"([\s\S]*?)";/) ||
    source.match(/export\s+const\s+\w*SYSTEM_PROMPT\w*\s*=\s*'([\s\S]*?)';/);
  if (stringMatch?.[1]) return stringMatch[1].trim();

  return null;
}

async function loadSystemPrompt(cwd: string): Promise<string> {
  const candidates = [
    path.join(cwd, "lib/reva/systemPrompt.ts"),
    path.join(cwd, "src/lib/reva/systemPrompt.ts"),
  ];

  for (const candidate of candidates) {
    if (!(await exists(candidate))) continue;
    try {
      const source = await readFile(candidate, "utf8");
      const extracted = extractPromptFromTsSource(source);
      if (extracted) return extracted;
      return source.trim() || FALLBACK_PROMPT;
    } catch {
      // keep trying
    }
  }

  return FALLBACK_PROMPT;
}

async function main() {
  const cwd = process.cwd();
  await loadDotenvLocal(cwd);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing. Add it to .env.local or environment.");
  }

  const openai = new OpenAI({ apiKey });
  const instructions = await loadSystemPrompt(cwd);

  const vectorStore = await openai.vectorStores.create({
    name: "ClosingPilot Knowledge Base — Tennessee",
  });

  const assistant = await openai.beta.assistants.create({
    name: "Reva — ClosingPilot TN",
    model: "gpt-4o",
    instructions,
    tools: [{ type: "file_search" }],
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStore.id],
      },
    },
  });

  console.log("✅ Assistant created!\n");
  console.log("Add these to Vercel env + .env.local:");
  console.log(`REVA_ASSISTANT_ID_TN=${assistant.id}`);
  console.log(`REVA_VECTOR_STORE_ID_TN=${vectorStore.id}`);
}

main().catch((err) => {
  console.error("Failed to set up Reva assistant:", err);
  process.exit(1);
});
