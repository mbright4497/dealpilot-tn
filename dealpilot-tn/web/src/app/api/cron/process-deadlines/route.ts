export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createClient();
  const { data: deals } = await supabase.from("deals").select("*");

  for (const deal of deals ?? []) {
    if (deal.status === "Inspection Period Active") {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notifications/send`, {
        method: "POST",
        body: JSON.stringify({ message: `Inspection active for ${deal.address}`, deal_id: deal.id, severity: "high" })
      });
    }
  }

  return NextResponse.json({ processed: true });
}
