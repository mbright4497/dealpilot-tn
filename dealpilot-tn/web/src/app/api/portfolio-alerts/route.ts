export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: deals } = await supabase
    .from("deals")
    .select("id,address,status,updated_at")
    .eq("agent_id", user.id);

  const alerts: { deal_id: string; severity: string; message: string }[] = [];

  for (const deal of deals ?? []) {
    if (deal.status === "Inspection Period Active") {
      alerts.push({
        deal_id: deal.id,
        severity: "medium",
        message: `Inspection window active for ${deal.address}`,
      });
    }
  }

  return NextResponse.json({ alerts });
}
