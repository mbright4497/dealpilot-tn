import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { openai } from "@/lib/openai/client";
import { buildDailyBriefingPrompt } from "@/lib/ai/prompts";

export const dynamic = "force-dynamic";

type Deal = {
  id: string;
  address: string;
  client: string | null;
  status: string | null;
  binding: string | null;
  closing: string | null;
};

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: deals, error } = await supabase
      .from("transactions")
      .select(
        "id, address, client, status, binding, closing"
      )
      .eq("user_id", user.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    const safeDeals: Deal[] = deals || [];
    const prompt = buildDailyBriefingPrompt(safeDeals);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "daily_briefing",
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              priorities: {
                type: "array",
                items: { type: "string" },
              },
              riskLevel: {
                type: "string",
                enum: ["green", "yellow", "red"],
              },
            },
            required: ["summary", "priorities", "riskLevel"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "You are EVA, an elite executive real estate transaction assistant. Be concise, strategic, and clear.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No AI response" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Daily briefing route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
