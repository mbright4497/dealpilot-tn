import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prefs, error } = await supabase.from('notification_preferences').select('*').eq('agent_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prefs });
}

export async function PUT(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(()=>({}));
  const payload = {
    agent_id: user.id,
    email_enabled: body.email_enabled ?? false,
    sms_enabled: body.sms_enabled ?? false,
    high_risk_sms: body.high_risk_sms ?? false,
  };

  const { data: existing } = await supabase.from('notification_preferences').select('*').eq('agent_id', user.id).maybeSingle();
  if (existing) {
    const { data, error } = await supabase.from('notification_preferences').update(payload).eq('agent_id', user.id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ prefs: data });
  } else {
    const { data, error } = await supabase.from('notification_preferences').insert(payload).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ prefs: data });
  }
}
