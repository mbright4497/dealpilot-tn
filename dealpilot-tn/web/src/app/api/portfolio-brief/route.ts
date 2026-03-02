import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: deals } = await supabase
    .from("deals")
    .select("id,address,stage,status")
    .eq("agent_id", user.id);

  const activeDeals = (deals || []).filter(d => d.status !== 'Closed')

  if (!activeDeals || activeDeals.length === 0) {
    return NextResponse.json({ summary: "No active transactions today." });
  }

  const summary = `You have ${activeDeals.length} active transactions. Focus on inspection timelines and document completion. Stay ahead of deadlines today.`.trim();

  return NextResponse.json({ summary });
}
