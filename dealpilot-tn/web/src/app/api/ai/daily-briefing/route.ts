// app/api/ai/daily-briefing/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { addDays } from "date-fns";
import { supabaseService } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import { openai } from "@/lib/openai/client";
import { DAILY_BRIEFING_SYSTEM } from "@/lib/ai/prompts";

export const runtime = "nodejs";

const BodySchema = z.object({
  daysAhead: z.number().int().min(1).max(30).default(14),
});

const BriefingSchema = z.object({
  dateISO: z.string(),
  vibe: z.enum(["calm", "executive", "friendly_tn", "joyful", "straight"]).default("executive"),
  headline: z.string(),
  prepared: z.object({
    deadlinesReviewed: z.number().int().min(0),
    tasksQueued: z.number().int().min(0),
    draftsReady: z.number().int().min(0),
  }),
  spotlight: z
    .object({
      transactionId: z.string().uuid().nullable(),
      title: z.string(),
      whyItMatters: z.string(),
      nextBestAction: z.object({
        label: z.string(),
        actionUrl: z.string(),
      }),
    })
    .nullable(),
  urgent: z.array(
    z.object({
      transactionId: z.string().uuid(),
      title: z.string(),
      dueAtISO: z.string(),
      severity: z.enum(["high", "medium"]),
      actionUrl: z.string(),
    }),
  ),
  decisions: z.array(
    z.object({
      transactionId: z.string().uuid().nullable(),
      question: z.string(),
      options: z.array(z.string()).min(2).max(5),
      actionUrl: z.string(),
    }),
  ),
  wins: z.array(
    z.object({
      transactionId: z.string().uuid().nullable(),
      message: z.string(),
    }),
  ),
  nextMoves: z.array(
    z.object({
      transactionId: z.string().uuid().nullable(),
      label: z.string(),
      actionUrl: z.string(),
      etaMinutes: z.number().int().min(1).max(240),
    }),
  ),
});

function isoNowDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const ownerId = await requireUserId();
    const svc = supabaseService();
    const body = BodySchema.parse(await req.json().catch(() => ({})));

    const now = new Date();
    const windowEnd = addDays(now, body.daysAhead).toISOString();

    const [txRes, dlRes, clRes] = await Promise.all([
      svc
        .from("transactions")
        .select("id,status,address,city,state,progress_percent,health_status,health_score,updated_at,closing_date,inspection_end_date")
        .eq("owner_id", ownerId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false }),
      svc
        .from("deadlines")
        .select("id,transaction_id,label,due_at,kind,status,source")
        .eq("owner_id", ownerId)
        .eq("status", "active")
        .gte("due_at", now.toISOString())
        .lte("due_at", windowEnd)
        .order("due_at", { ascending: true }),
      svc
        .from("checklist_items")
        .select("id,transaction_id,title,status,priority,due_at,created_by")
        .eq("owner_id", ownerId)
        .in("status", ["todo", "in_progress"])
        .order("priority", { ascending: true })
        .order("due_at", { ascending: true, nullsFirst: false }),
    ]);

    if (txRes.error) return NextResponse.json({ error: txRes.error.message }, { status: 500 });
    if (dlRes.error) return NextResponse.json({ error: dlRes.error.message }, { status: 500 });
    if (clRes.error) return NextResponse.json({ error: clRes.error.message }, { status: 500 });

    const txs = txRes.data ?? [];
    const deadlines = dlRes.data ?? [];
    const checklist = clRes.data ?? [];

    const statusCounts = txs.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    }, {});

    const urgentDeadlines = deadlines.slice(0, 12).map((d) => ({
      transaction_id: d.transaction_id,
      label: d.label,
      due_at: d.due_at,
      kind: d.kind,
    }));

    const topTasks = checklist.slice(0, 12).map((c) => ({
      transaction_id: c.transaction_id,
      title: c.title,
      priority: c.priority,
      due_at: c.due_at,
      status: c.status,
    }));

    const context = {
      today: isoNowDate(),
      timezone: "America/New_York",
      portfolio: {
        transactionCount: txs.length,
        statusCounts,
      },
      upcomingDeadlines: urgentDeadlines,
      topTasks,
      transactions: txs.slice(0, 25).map((t) => ({
        id: t.id,
        status: t.status,
        address: t.address,
        city: t.city,
        state: t.state,
        progress_percent: t.progress_percent,
        health_status: t.health_status,
        health_score: t.health_score,
        closing_date: t.closing_date,
        inspection_end_date: t.inspection_end_date,
      })),
    };

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        dateISO: { type: "string" },
        vibe: { type: "string", enum: ["calm", "executive", "friendly_tn", "joyful", "straight"] },
        headline: { type: "string" },
        prepared: {
          type: "object",
          additionalProperties: false,
          properties: {
            deadlinesReviewed: { type: "integer" },
            tasksQueued: { type: "integer" },
            draftsReady: { type: "integer" },
          },
          required: ["deadlinesReviewed", "tasksQueued", "draftsReady"],
        },
        spotlight: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              additionalProperties: false,
              properties: {
                transactionId: { anyOf: [{ type: "string" }, { type: "null" }] },
                title: { type: "string" },
                whyItMatters: { type: "string" },
                nextBestAction: {
                  type: "object",
                  additionalProperties: false,
                  properties: { label: { type: "string" }, actionUrl: { type: "string" } },
                  required: ["label", "actionUrl"],
                },
              },
              required: ["transactionId", "title", "whyItMatters", "nextBestAction"],
            },
          ],
        },
        urgent: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              transactionId: { type: "string" },
              title: { type: "string" },
              dueAtISO: { type: "string" },
              severity: { type: "string", enum: ["high", "medium"] },
              actionUrl: { type: "string" },
            },
            required: ["transactionId", "title", "dueAtISO", "severity", "actionUrl"],
          },
        },
        decisions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              transactionId: { anyOf: [{ type: "string" }, { type: "null" }] },
              question: { type: "string" },
              options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
              actionUrl: { type: "string" },
            },
            required: ["transactionId", "question", "options", "actionUrl"],
          },
        },
        wins: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              transactionId: { anyOf: [{ type: "string" }, { type: "null" }] },
              message: { type: "string" },
            },
            required: ["transactionId", "message"],
          },
        },
        nextMoves: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              transactionId: { anyOf: [{ type: "string" }, { type: "null" }] },
              label: { type: "string" },
              actionUrl: { type: "string" },
              etaMinutes: { type: "integer", minimum: 1, maximum: 240 },
            },
            required: ["transactionId", "label", "actionUrl", "etaMinutes"],
          },
        },
      },
      required: ["dateISO", "vibe", "headline", "prepared", "spotlight", "urgent", "decisions", "wins", "nextMoves"],
    } as const;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      temperature: 0.25,
      messages: [
        { role: "system", content: DAILY_BRIEFING_SYSTEM },
        {
          role: "user",
          content: `Use this portfolio context to produce the morning briefing JSON.\n\nCONTEXT:\n${JSON.stringify(context)}`,
        },
      ],
      response_format: { type: "json_schema", json_schema: { name: "DailyBriefing", schema } },
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const briefing = BriefingSchema.parse(JSON.parse(content));

    await svc.from("activity_log").insert({
      owner_id: ownerId,
      actor: "ai",
      event_type: "daily_briefing_generated",
      message: `Eva prepared your morning briefing for ${briefing.dateISO}.`,
      meta: { model: completion.model, daysAhead: body.daysAhead, txCount: txs.length },
    });

    return NextResponse.json({ briefing });
  } catch (e: any) {
    const msg = e?.message === "UNAUTHENTICATED" ? "Unauthorized" : e?.message ?? "Unknown error";
    return NextResponse.json({ error: msg }, { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
