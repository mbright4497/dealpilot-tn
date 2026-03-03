// app/api/checklist/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";

export const runtime = "nodejs";

const PatchSchema = z.object({
  status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
  completed: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const ownerId = await requireUserId();
    const body = PatchSchema.parse(await req.json());
    const svc = supabaseService();

    const patch: any = {};
    if (body.completed === true) {
      patch.status = "done";
      patch.completed_at = new Date().toISOString();
    } else if (body.completed === false) {
      patch.status = "todo";
      patch.completed_at = null;
    }
    if (body.status) patch.status = body.status;

    const upd = await svc
      .from("checklist_items")
      .update(patch)
      .eq("id", ctx.params.id)
      .eq("owner_id", ownerId)
      .select("id,transaction_id,title,status,priority,due_at,completed_at")
      .single();

    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    await svc.from("activity_log").insert({
      owner_id: ownerId,
      transaction_id: upd.data.transaction_id,
      actor: "user",
      event_type: "checklist_updated",
      message: `Checklist updated: ${upd.data.title}`,
      meta: { checklistId: upd.data.id, status: upd.data.status },
    });

    return NextResponse.json({ item: upd.data });
  } catch (e: any) {
    const msg = e?.message === "UNAUTHENTICATED" ? "Unauthorized" : e?.message ?? "Bad request";
    return NextResponse.json({ error: msg }, { status: e?.message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
