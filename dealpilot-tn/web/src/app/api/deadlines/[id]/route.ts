// app/api/deadlines/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";

export const runtime = "nodejs";

const PatchSchema = z.object({
  status: z.enum(["active", "done", "dismissed"]).optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const ownerId = await requireUserId();
    const body = PatchSchema.parse(await req.json());
    const svc = supabaseService();

    const patch: any = {};
    if (body.status) patch.status = body.status;
    if (body.status === "done") patch.completed_at = new Date().toISOString();

    const upd = await svc
      .from("deadlines")
      .update(patch)
      .eq("id", ctx.params.id)
      .eq("owner_id", ownerId)
      .select("id,transaction_id,label,status,due_at")
      .single();

    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    await svc.from("activity_log").insert({
      owner_id: ownerId,
      transaction_id: upd.data.transaction_id,
      actor: "user",
      event_type: "deadline_updated",
      message: `Deadline updated: ${upd.data.label}`,
      meta: { deadlineId: upd.data.id, status: upd.data.status },
    });

    return NextResponse.json({ deadline: upd.data });
  } catch (e: any) {
    const msg = e?.message === "UNAUTHENTICATED" ? "Unauthorized" : e?.message ?? "Bad request";
    return NextResponse.json({ error: msg }, { status: e?.message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
