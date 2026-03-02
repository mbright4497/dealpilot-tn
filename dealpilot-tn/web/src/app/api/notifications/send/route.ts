import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { sendEmail, sendSMS } from "@/lib/notifications";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { message, deal_id, severity } = body;

  const { data: profile } = await supabase
    .from("agent_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("agent_id", user.id)
    .single();

  if (prefs?.email_enabled) {
    await sendEmail(profile.email, "DealPilot Alert", `<p>${message}</p>`);
  }

  if (prefs?.sms_enabled && prefs?.high_risk_sms && severity === "high") {
    if (profile.phone) {
      await sendSMS(profile.phone, message);
    }
  }

  await supabase.from("notification_logs").insert({ agent_id: user.id, deal_id, type: severity, channel: prefs?.sms_enabled ? "sms" : "email", message, });

  return NextResponse.json({ success: true });
}
