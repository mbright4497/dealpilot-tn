import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mlsNumber } = await request.json();

  // TODO: Replace with real MLS provider API (RETS/RESO)
  const mockMLSData = { address: "123 Tennessee Ridge Rd", city: "Johnson City", state: "TN", price: 450000, status: "Draft" };

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({ agent_id: user.id, address: mockMLSData.address, status: mockMLSData.status, external_source: "MLS", external_id: mlsNumber })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("deal_events").insert({ deal_id: deal.id, agent_id: user.id, type: "import", description: `Deal created via MLS import (${mlsNumber})` });

  return NextResponse.json({ deal });
}
