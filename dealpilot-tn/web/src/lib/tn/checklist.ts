// lib/tn/checklist.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function seedChecklistForTransaction(args: {
  ownerId: string;
  transactionId: string;
  supabase: SupabaseClient;
}) {
  const { ownerId, transactionId, supabase } = args;

  // Only seed once: if checklist already has system items, skip.
  const existing = await supabase
    .from("checklist_items")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("transaction_id", transactionId)
    .eq("created_by", "system")
    .limit(1);

  if (existing.error) throw new Error(existing.error.message);
  if ((existing.data ?? []).length > 0) return;

  const items = [
    { title: "Confirm binding date + key dates", priority: 1 },
    { title: "Verify earnest money delivery plan", priority: 1 },
    { title: "Schedule inspection (or confirm already scheduled)", priority: 1 },
    { title: "Send timeline email to client", priority: 2 },
    { title: "Confirm lender contact + appraisal expectations", priority: 2 },
    { title: "Confirm title company + open title", priority: 2 },
    { title: "Create repair negotiation plan (if inspection reveals issues)", priority: 3 },
  ];

  const ins = await supabase.from("checklist_items").insert(
    items.map((i) => ({
      owner_id: ownerId,
      transaction_id: transactionId,
      title: i.title,
      status: "todo",
      priority: i.priority,
      created_by: "system",
      derived_from: { seed: "tn_under_contract_v2" },
    })),
  );
  if (ins.error) throw new Error(ins.error.message);
}
