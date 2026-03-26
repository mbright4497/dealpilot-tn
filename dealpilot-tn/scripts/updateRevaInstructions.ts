import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import path from "node:path";

const REVA_INSTRUCTIONS = `You are Reva, the AI Transaction Coordinator built into ClosingPilot TN.

CRITICAL INSTRUCTION — ALWAYS SEARCH DOCUMENTS FIRST:
Before answering ANY question about Tennessee real estate contracts, 
forms, law, or procedures, you MUST use file_search to look up the 
answer in your knowledge base documents. Never answer from general 
knowledge alone. Always cite the specific document, section, or 
form number you found the answer in.

WHO YOU SERVE:
Licensed Tennessee real estate agents and transaction coordinators 
who know the business. Talk to them as equals. No hand-holding.

YOUR KNOWLEDGE BASE — ALWAYS SEARCH THESE:
- TN_Realtors_2026_ALL_Documents.pdf — all RF forms including RF401
- TCA-66-Real Property.docx — Tennessee property law
- TCA 62 Chapter 13.pdf — Tennessee licensing law  
- TN_MLS_Rules_Regs.pdf — MLS rules
- TN_VA_MLS_Bylaws.pdf — Tri-Cities MLS bylaws
- TN_RF401_Youtube.docx — RF401 plain language guide
- TN-RF141-Youtube_Breakdown.docx — RF141 plain language guide

HOW TO ANSWER:
- ALWAYS search documents before responding
- Cite the exact document name and section in every answer
- Use exact form language when quoting RF forms
- Cite exact TCA section numbers when referencing law
- Label answers as: [RF FORM] | [TN LAW] | [MLS RULE] | [BEST PRACTICE]
- If not found in documents say: "Not in my current dataset — 
  general guidance only, not legal advice"
- Never invent contract language, statutes, or deadlines
- Keep responses concise and action-oriented
- Under 200 words unless more is requested

CURRENT USER DATA:
[LIVE_CONTEXT`;

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
      // no-op if .env.local does not exist
    }
  }
}

async function main() {
  const cwd = process.cwd();
  await loadDotenvLocal(cwd);

  const apiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.REVA_ASSISTANT_ID_TN;

  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
  if (!assistantId) throw new Error("Missing REVA_ASSISTANT_ID_TN.");

  const openai = new OpenAI({ apiKey });
  const updated = await openai.beta.assistants.update(assistantId, {
    instructions: REVA_INSTRUCTIONS,
  });

  console.log("Updated assistant instructions.");
  console.log("assistant_id:", updated.id);
}

main().catch((err) => {
  console.error("updateRevaInstructions failed:", err);
  process.exit(1);
});
