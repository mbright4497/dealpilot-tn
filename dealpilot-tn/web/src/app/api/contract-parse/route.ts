// /api/contract-parse/route.ts
import { NextResponse } from "next/server";
// pdf-parse loaded dynamically to avoid Vercel build error
export const runtime = "nodejs";

type Severity = "error" | "warning" | "info";

type ParsedPayload = {
  fields: {
    propertyAddress: string | null;
    buyerNames: string[];
    sellerNames: string[];
    purchasePrice: number | null;
    earnestMoney: number | null;
    bindingDate: string | null; // YYYY-MM-DD preferred
    closingDate: string | null; // YYYY-MM-DD preferred
    inspectionEndDate: string | null; // YYYY-MM-DD preferred
    financingContingencyDate: string | null; // YYYY-MM-DD preferred
    specialStipulations: string | null;
    contractType: "buyer" | "seller" | "unknown";
  };
  issues: Array<{
    field: string;
    severity: Severity;
    message: string;
    section: string;
  }>;
  timeline: Array<{
    label: string;
    date: string | null; // YYYY-MM-DD preferred
    status: "pending" | "complete";
  }>;
};

function cleanJsonFromText(raw: string) {
  // Prefer the first JSON object in the response if model wraps it.
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return raw.slice(firstBrace, lastBrace + 1);
  return raw;
}

function base64ToBuffer(base64: string) {
  // Accept data URL or raw base64
  const b64 = base64.includes(",") ? base64.split(",").pop() || "" : base64;
  return Buffer.from(b64, "base64");
}

function truncateForModel(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  // Keep front + tail; contracts sometimes have addenda near end
  const head = text.slice(0, Math.floor(maxChars * 0.7));
  const tail = text.slice(text.length - Math.floor(maxChars * 0.3));
  return `${head}\n\n---TRUNCATED---\n\n${tail}`;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const fileBase64 = body?.file;

    if (!fileBase64 || typeof fileBase64 !== "string") {
      return NextResponse.json({ error: "Body must include { file: base64Pdf }" }, { status: 400 });
    }

    const pdfBuffer = base64ToBuffer(fileBase64);

    // 1) Extract text from PDF
    let extractedText = "";
    try {
      const parsed = await (await import("pdf-parse")).default(pdfBuffer);
      extractedText = (parsed?.text || "").trim();
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to parse PDF text. Ensure the PDF contains selectable text (not scanned image-only)." },
        { status: 400 }
      );
    }

    if (!extractedText) {
      return NextResponse.json(
        { error: "No text extracted from PDF. If this is a scanned contract, add OCR before parsing." },
        { status: 400 }
      );
    }

    // 2) Send extracted text to GPT-4o
    const contractText = truncateForModel(extractedText, 120_000);

    const system = [
      "You are EVA, a Tennessee real estate transaction coordinator assistant.",
      "You extract structured data from Tennessee REALTORS® RF401 (Purchase & Sale Agreement) contract text.",
      "Return ONLY valid JSON that matches the requested schema. Do not include markdown, explanations, or extra keys.",
      "If a field is missing or uncertain, set it to null (or [] for arrays) and create an issue in the issues array.",
      "Dates: return YYYY-MM-DD when possible. Currency/amounts: numbers (no $ or commas).",
    ].join("\n");

    const user = [
      "Extract the following RF401 fields from the contract text:",
      "- propertyAddress (string)",
      "- buyerNames (array of strings)",
      "- sellerNames (array of strings)",
      "- purchasePrice (number)",
      "- earnestMoney (number)",
      "- bindingDate (YYYY-MM-DD)",
      "- closingDate (YYYY-MM-DD)",
      "- inspectionEndDate (YYYY-MM-DD)",
      "- financingContingencyDate (YYYY-MM-DD)",
      "- specialStipulations (string)",
      "- contractType: 'buyer' | 'seller' | 'unknown' (infer from context if possible)",
      "",
      "ALSO return an issues array with objects:",
      "{ field, severity:'error'|'warning'|'info', message, section }",
      "Use issues to flag:",
      "- missing required or common fields",
      "- inconsistencies (e.g., inspection end after closing, earnest money missing/0, dates not parseable)",
      "- potential compliance or risk concerns based on the text (be conservative; use 'warning' if unsure).",
      "",
      "ALSO return a timeline array with objects:",
      "{ label, date, status:'pending'|'complete' }",
      "Include at minimum these labels when possible:",
      "- Contract Executed (Binding Date)",
      "- Earnest Money Due",
      "- Inspection Period Ends",
      "- Financing Contingency Deadline",
      "- Closing Date",
      "If a date isn't found, put null and add an issue.",
      "",
      "Return JSON in this exact top-level shape:",
      "{ fields: {...}, issues: [...], timeline: [...] }",
      "",
      "CONTRACT TEXT START:\n" + contractText + "\nCONTRACT TEXT END",
    ].join("\n");

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => "");
      return NextResponse.json(
        { error: "OpenAI request failed", details: errText || `Status ${openaiRes.status}` },
        { status: 500 }
      );
    }

    const completion = await openaiRes.json();
    const raw = completion?.choices?.[0]?.message?.content;

    if (!raw || typeof raw !== "string") {
      return NextResponse.json({ error: "OpenAI returned no content" }, { status: 500 });
    }

    let parsed: ParsedPayload | null = null;
    try {
      parsed = JSON.parse(cleanJsonFromText(raw)) as ParsedPayload;
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to parse model JSON", raw },
        { status: 500 }
      );
    }

    // Minimal safety normalization (no placeholders; just ensure expected keys exist)
    const safe: ParsedPayload = {
      fields: {
        propertyAddress: parsed?.fields?.propertyAddress ?? null,
        buyerNames: Array.isArray(parsed?.fields?.buyerNames) ? parsed.fields.buyerNames : [],
        sellerNames: Array.isArray(parsed?.fields?.sellerNames) ? parsed.fields.sellerNames : [],
        purchasePrice: typeof parsed?.fields?.purchasePrice === "number" ? parsed.fields.purchasePrice : null,
        earnestMoney: typeof parsed?.fields?.earnestMoney === "number" ? parsed.fields.earnestMoney : null,
        bindingDate: parsed?.fields?.bindingDate ?? null,
        closingDate: parsed?.fields?.closingDate ?? null,
        inspectionEndDate: parsed?.fields?.inspectionEndDate ?? null,
        financingContingencyDate: parsed?.fields?.financingContingencyDate ?? null,
        specialStipulations: parsed?.fields?.specialStipulations ?? null,
        contractType:
          parsed?.fields?.contractType === "buyer" || parsed?.fields?.contractType === "seller"
            ? parsed.fields.contractType
            : "unknown",
      },
      issues: Array.isArray(parsed?.issues)
        ? parsed.issues.map((i: any) => ({
            field: String(i?.field ?? ""),
            severity: (i?.severity === "error" || i?.severity === "warning" || i?.severity === "info") ? i.severity : "info",
            message: String(i?.message ?? ""),
            section: String(i?.section ?? ""),
          }))
        : [],
      timeline: Array.isArray(parsed?.timeline)
        ? parsed.timeline.map((t: any) => ({
            label: String(t?.label ?? ""),
            date: t?.date ?? null,
            status: t?.status === "complete" ? "complete" : "pending",
          }))
        : [],
    };

    return NextResponse.json(safe);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Contract parsing failed" }, { status: 500 });
  }
}
