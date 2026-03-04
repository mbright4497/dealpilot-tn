// app/api/ai/extract/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import { openai } from "@/lib/openai/client";
import { CONTRACT_EXTRACTION_SYSTEM, CONTRACT_EXTRACTION_USER } from "@/lib/ai/prompts";
import { recalcDeadlinesForTransaction } from "@/lib/tn/deadlines";
import { seedChecklistForTransaction } from "@/lib/tn/checklist";

export const runtime = "nodejs";

const BodySchema = z.object({
  documentId: z.string().uuid(),
  transactionId: z.string().uuid().optional(),
});

const ExtractionSchema = z.object({
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
  county: z.string().nullable(),

  binding_date: z.string().nullable(), // YYYY-MM-DD
  closing_date: z.string().nullable(),
  inspection_end_date: z.string().nullable(),

  purchase_price: z.number().nullable(),
  earnest_money: z.number().nullable(),

  buyer_names: z.array(z.string()).default([]),
  seller_names: z.array(z.string()).default([]),

  warnings: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).nullable(),
});

async function pdfToText(buf: Buffer): Promise<{ text: string; pageCount?: number }> {
  // pdf-parse is common and works in Node runtime
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as any;
  const out = await pdfParse(buf);
  const text = String(out.text ?? "").trim();
  const pages = typeof out.numpages === "number" ? out.numpages : undefined;
  return { text, pageCount: pages };
}

export async function POST(req: Request) {
  try {
    const ownerId = await requireUserId();
    const body = BodySchema.parse(await req.json());
    const svc = supabaseService();

    const docRes = await svc
      .from("documents")
      .select("id, owner_id, transaction_id, storage_bucket, storage_path, mime_type, kind, file_name")
      .eq("id", body.documentId)
      .single();

    if (docRes.error) return NextResponse.json({ error: docRes.error.message }, { status: 500 });
    if (!docRes.data || docRes.data.owner_id !== ownerId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const signed = await svc.storage.from(docRes.data.storage_bucket).createSignedUrl(docRes.data.storage_path, 300);
    if (signed.error) return NextResponse.json({ error: signed.error.message }, { status: 500 });

    const fileResp = await fetch(signed.data.signedUrl);
    if (!fileResp.ok) return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });

    const buf = Buffer.from(await fileResp.arrayBuffer());
    const { text, pageCount } = await pdfToText(buf);

    if (!text || text.length < 50) {
      await svc.from("documents").update({ processed_at: new Date().toISOString(), extracted_text: text, page_count: pageCount ?? null }).eq("id", body.documentId);
      return NextResponse.json({ error: "Document text extraction yielded too little text" }, { status: 422 });
    }

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        address: { type: ["string", "null"] },
        city: { type: ["string", "null"] },
        state: { type: ["string", "null"] },
        zip: { type: ["string", "null"] },
        county: { type: ["string", "null"] },

        binding_date: { type: ["string", "null"] },
        closing_date: { type: ["string", "null"] },
        inspection_end_date: { type: ["string", "null"] },

        purchase_price: { type: ["number", "null"] },
        earnest_money: { type: ["number", "null"] },

        buyer_names: { type: "array", items: { type: "string" } },
        seller_names: { type: "array", items: { type: "string" } },

        warnings: { type: "array", items: { type: "string" } },
        confidence: { type: ["number", "null"] },
      },
      required: ["address","city","state","zip","county","binding_date","closing_date","inspection_end_date","purchase_price","earnest_money","buyer_names","seller_names","warnings","confidence"],
    } as const;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      temperature: 0.1,
      messages: [
        { role: "system", content: CONTRACT_EXTRACTION_SYSTEM },
        { role: "user", content: CONTRACT_EXTRACTION_USER({ text: text.slice(0, 120_000), state: "TN" }) },
      ],
      response_format: { type: "json_schema", json_schema: { name: "ContractExtraction", schema } },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = ExtractionSchema.parse(JSON.parse(content));

    // Update documents with extracted_text + metadata
    await svc
      .from("documents")
      .update({
        extracted_text: text,
        page_count: pageCount ?? null,
        extracted_json: parsed,
        ai_confidence: parsed.confidence ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", body.documentId);

    // Create or update a transaction
    let transactionId = body.transactionId ?? docRes.data.transaction_id ?? undefined;

    if (!transactionId) {
      if (!parsed.address) return NextResponse.json({ error: "Could not determine address; please create transaction then re-run extraction." }, { status: 422 });

      const txIns = await svc
        .from("transactions")
        .insert({
          owner_id: ownerId,
          address: parsed.address,
          city: parsed.city ?? null,
          state: (parsed.state ?? "TN") as any,
          zip: parsed.zip ?? null,
          county: parsed.county ?? null,
          binding_date: parsed.binding_date ?? null,
          closing_date: parsed.closing_date ?? null,
          inspection_end_date: parsed.inspection_end_date ?? null,
          purchase_price: parsed.purchase_price ?? null,
          earnest_money: parsed.earnest_money ?? null,
          status: "under_contract",
          progress_percent: 15,
        })
        .select("id")
        .single();

      if (txIns.error) return NextResponse.json({ error: txIns.error.message }, { status: 500 });
      transactionId = txIns.data.id;

      await svc.from("documents").update({ transaction_id: transactionId }).eq("id", body.documentId);
    } else {
      // Patch key fields onto existing transaction if missing / zero-like
      await svc
        .from("transactions")
        .update({
          address: parsed.address ?? undefined,
          city: parsed.city ?? undefined,
          state: (parsed.state ?? undefined) as any,
          zip: parsed.zip ?? undefined,
          county: parsed.county ?? undefined,
          binding_date: parsed.binding_date ?? undefined,
          closing_date: parsed.closing_date ?? undefined,
          inspection_end_date: parsed.inspection_end_date ?? undefined,
          purchase_price: parsed.purchase_price ?? undefined,
          earnest_money: parsed.earnest_money ?? undefined,
        })
        .eq("id", transactionId)
        .eq("owner_id", ownerId);
    }

    // Versioned extraction record
    const extractionIns = await svc
      .from("contract_extractions")
      .insert({
        owner_id: ownerId,
        transaction_id: transactionId,
        document_id: body.documentId,
        model: completion.model,
        confidence: parsed.confidence ?? null,
        fields: parsed,
        warnings: parsed.warnings,
        raw_text_excerpt: text.slice(0, 2000),
      })
      .select("id")
      .single();

    if (extractionIns.error) return NextResponse.json({ error: extractionIns.error.message }, { status: 500 });

    // Deadlines + checklist seed (Eva does the work FOR the agent)
    await recalcDeadlinesForTransaction({ ownerId, transactionId, supabase: svc });
    await seedChecklistForTransaction({ ownerId, transactionId, supabase: svc });

    await svc.from("activity_log").insert({
      owner_id: ownerId,
      transaction_id: transactionId,
      actor: "ai",
      event_type: "contract_extracted",
      message: `Eva extracted contract data from ${docRes.data.file_name} and prepared deadlines + checklist.`,
      meta: { documentId: body.documentId, extractionId: extractionIns.data.id },
    });

    return NextResponse.json({
      transactionId,
      extractionId: extractionIns.data.id,
      deadlinesRecalculated: true,
    });
  } catch (e: any) {
    const msg = e?.message === "UNAUTHENTICATED" ? "Unauthorized" : e?.message ?? "Unknown error";
    return NextResponse.json({ error: msg }, { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
