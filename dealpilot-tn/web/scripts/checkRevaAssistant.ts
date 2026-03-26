import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function loadDotenvLocal(cwd: string): Promise<void> {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: path.join(cwd, ".env.local") });
  } catch {
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
      // no-op when .env.local doesn't exist
    }
  }
}

async function main() {
  const cwd = process.cwd();
  await loadDotenvLocal(cwd);

  const apiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.REVA_ASSISTANT_ID_TN;
  const vectorStoreId = process.env.REVA_VECTOR_STORE_ID_TN;

  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
  if (!assistantId) throw new Error("Missing REVA_ASSISTANT_ID_TN.");
  if (!vectorStoreId) throw new Error("Missing REVA_VECTOR_STORE_ID_TN.");

  const openai = new OpenAI({ apiKey });
  const assistant = await openai.beta.assistants.retrieve(assistantId);

  console.log("=== Assistant ===");
  console.log("id:", assistant.id);
  console.log("name:", assistant.name);
  console.log("model:", assistant.model);
  console.log("tools:", JSON.stringify(assistant.tools, null, 2));
  console.log("tool_resources:", JSON.stringify(assistant.tool_resources, null, 2));

  console.log("\n=== Vector Store Files ===");
  console.log("vector_store_id:", vectorStoreId);

  const files = await openai.vectorStores.files.list(vectorStoreId, { limit: 100 });
  if (!files.data.length) {
    console.log("No files found in vector store.");
    return;
  }

  for (const file of files.data) {
    const status = file.status ?? "unknown";
    const fileId = ((file as any).file_id as string | undefined) ?? file.id;
    let fileName = fileId;

    if (fileId) {
      try {
        const sourceFile = await openai.files.retrieve(fileId);
        if ("filename" in sourceFile && sourceFile.filename) {
          fileName = sourceFile.filename;
        }
      } catch {
        // Keep fallback id/name if file lookup fails.
      }
    }

    console.log(`- ${fileName}: ${status}`);
  }
}

main().catch((err) => {
  console.error("checkRevaAssistant failed:", err);
  process.exit(1);
});
