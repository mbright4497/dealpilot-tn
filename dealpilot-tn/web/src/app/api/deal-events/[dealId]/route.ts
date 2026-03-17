export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { dealId: string } }
) {
  const supabase = createServerSupabaseClient({ request, response: undefined as any });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: events, error } = await supabase
    .from("deal_events")
    .select("*")
    .eq("deal_id", params.dealId)
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events });
}
