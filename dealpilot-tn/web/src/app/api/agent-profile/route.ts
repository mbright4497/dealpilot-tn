export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { getSupabaseSafe } from "@/lib/supabase";

type AgentRole = "agent" | "broker" | "tc";

export async function GET() {
  const supabase = getSupabaseSafe();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("agent_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    const { data: created, error: createError } = await supabase
      .from("agent_profiles")
      .insert({ id: user.id, email: user.email ?? "", full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null, phone: null, brokerage_name: null, license_number: null, role: "agent" as AgentRole, })
      .select("*")
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ profile: created });
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const supabase = getSupabaseSafe();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const payload: Partial<{ full_name: string | null; phone: string | null; brokerage_name: string | null; license_number: string | null; role: AgentRole }> = { full_name: body.full_name ?? null, phone: body.phone ?? null, brokerage_name: body.brokerage_name ?? null, license_number: body.license_number ?? null, };

  if (body.role === "agent" || body.role === "broker" || body.role === "tc") {
    payload.role = body.role;
  }

  const { data: updated, error } = await supabase
    .from("agent_profiles")
    .update(payload)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
