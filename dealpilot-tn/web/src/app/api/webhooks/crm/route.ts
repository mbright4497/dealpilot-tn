export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const supabase = createClient();
  const body = await request.json();
  const { agent_id, contact_name, property_address } = body;

  if (!agent_id || !property_address) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({ agent_id, address: property_address, status: "Draft", external_source: "CRM" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("deal_events").insert({ deal_id: deal.id, agent_id, type: "crm_auto_create", description: `Deal auto-created from CRM lead: ${contact_name}` });

  return NextResponse.json({ success: true, deal });
}
