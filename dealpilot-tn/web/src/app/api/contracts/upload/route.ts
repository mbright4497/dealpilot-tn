export const dynamic = 'force-dynamic'
// app/api/contracts/upload/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { supabaseService } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import { supabaseUser } from "@/lib/supabase";

export const runtime = "nodejs";

const QuerySchema = z.object({
  transactionId: z.string().uuid().optional(),
  kind: z.enum([
    "purchase_agreement",
    "addendum",
    "disclosure",
    "inspection_report",
    "repair_request",
    "appraisal",
    "title",
    "closing",
    "other",
  ]).default("purchase_agreement"),
});

export async function POST(req: Request) {
  try {
    const ownerId = await requireUserId();
    const url = new URL(req.url);
    const parsed = QuerySchema.parse({
      transactionId: url.searchParams.get("transactionId") ?? undefined,
      kind: (url.searchParams.get("kind") ?? undefined) as any,
    });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!file.type.includes("pdf")) {
      return NextResponse.json({ error: "Only PDF supported" }, { status: 400 });
    }

    const arrayBuf = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");

    const now = new Date();
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const storagePath = `${ownerId}/${now.toISOString().slice(0, 10)}/${crypto.randomUUID()}_${safeName}`;

    const svc = supabaseService();

    const up = await svc.storage
      .from("documents")
      .upload(storagePath, buf, { contentType: file.type, upsert: false });

    if (up.error) {
      return NextResponse.json({ error: up.error.message }, { status: 500 });
    }

    const ins = await svc
      .from("documents")
      .insert({
        owner_id: ownerId,
        user_id: ownerId,
        transaction_id: parsed.transactionId ?? null,
        kind: parsed.kind,
        file_name: file.name,
        mime_type: file.type,
        storage_bucket: "documents",
        storage_path: storagePath,
        size_bytes: buf.length,
        sha256,
      })
      .select("id, transaction_id")
      .single();

    if (ins.error) {
      return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }

    // Trigger extraction immediately (server-to-server call keeps auth cookies in scope)
    const supa = supabaseUser();
    const { data: sessionData } = await supa.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const res = await fetch(`${process.env.APP_URL}/api/ai/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ documentId: ins.data.id }),
    });

    const json = await res.json();
    if (!res.ok) return NextResponse.json(json, { status: res.status });

    return NextResponse.json({
      documentId: ins.data.id,
      transactionId: json.transactionId ?? ins.data.transaction_id ?? null,
      extractionId: json.extractionId,
      deadlinesRecalculated: json.deadlinesRecalculated,
    });
  } catch (e: any) {
    const msg = e?.message === "UNAUTHENTICATED" ? "Unauthorized" : e?.message ?? "Unknown error";
    return NextResponse.json({ error: msg }, { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
