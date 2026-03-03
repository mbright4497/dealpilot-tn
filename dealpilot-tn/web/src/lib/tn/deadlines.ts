// lib/tn/deadlines.ts
import { addDays, formatISO, isWeekend, parseISO, setHours, setMinutes, setSeconds } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

const TN_HOLIDAYS_ISO = new Set<string>([
  // Keep this list current yearly; for production you can store holidays in a table.
  // 2026 observed examples (update as needed)
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-09-07",
  "2026-10-12",
  "2026-11-11",
  "2026-11-26",
  "2026-12-25",
]);

function isHoliday(d: Date) {
  const iso = formatISO(d, { representation: "date" });
  return TN_HOLIDAYS_ISO.has(iso);
}

function nextBusinessDay(d: Date) {
  let cur = d;
  while (isWeekend(cur) || isHoliday(cur)) cur = addDays(cur, 1);
  return cur;
}

function addBusinessDays(start: Date, days: number) {
  let cur = start;
  let added = 0;
  while (added < days) {
    cur = addDays(cur, 1);
    if (!isWeekend(cur) && !isHoliday(cur)) added++;
  }
  return cur;
}

function atNoonLocal(d: Date) {
  let out = d;
  out = setHours(out, 12);
  out = setMinutes(out, 0);
  out = setSeconds(out, 0);
  return out;
}

export async function recalcDeadlinesForTransaction(args: {
  ownerId: string;
  transactionId: string;
  supabase: SupabaseClient;
}) {
  const { ownerId, transactionId, supabase } = args;

  const txRes = await supabase
    .from("transactions")
    .select("id, owner_id, binding_date, closing_date, inspection_end_date")
    .eq("id", transactionId)
    .single();

  if (txRes.error) throw new Error(txRes.error.message);
  if (!txRes.data || txRes.data.owner_id !== ownerId) throw new Error("Not found");

  const binding = txRes.data.binding_date ? parseISO(txRes.data.binding_date) : null;
  const closing = txRes.data.closing_date ? parseISO(txRes.data.closing_date) : null;
  const inspectionEnd = txRes.data.inspection_end_date ? parseISO(txRes.data.inspection_end_date) : null;

  // Clear system deadlines (keep user/custom)
  await supabase
    .from("deadlines")
    .delete()
    .eq("owner_id", ownerId)
    .eq("transaction_id", transactionId)
    .eq("source", "system");

  const deadlines: Array<{ kind: any; label: string; due_at: string; derived_from: any }> = [];

  if (binding) {
    deadlines.push({
      kind: "binding_date",
      label: "Binding Date",
      due_at: atNoonLocal(nextBusinessDay(binding)).toISOString(),
      derived_from: { source: "contract", field: "binding_date" },
    });
  }
  if (inspectionEnd) {
    deadlines.push({
      kind: "inspection_end",
      label: "Inspection Ends",
      due_at: atNoonLocal(nextBusinessDay(inspectionEnd)).toISOString(),
      derived_from: { source: "contract", field: "inspection_end_date" },
    });
  }
  if (closing) {
    deadlines.push({
      kind: "closing_date",
      label: "Closing Date",
      due_at: atNoonLocal(nextBusinessDay(closing)).toISOString(),
      derived_from: { source: "contract", field: "closing_date" },
    });

    // Example “7 business days before closing” style milestone
    const titleSearchDeadline = addBusinessDays(closing, -7 as any); // not supported by helper
    // implement subtract via adding negative
    const minus7 = (() => {
      let cur = closing;
      let remaining = 7;
      while (remaining > 0) {
        cur = addDays(cur, -1);
        if (!isWeekend(cur) && !isHoliday(cur)) remaining--;
      }
      return cur;
    })();

    deadlines.push({
      kind: "title_deadline",
      label: "Title Work Target (7 business days before closing)",
      due_at: atNoonLocal(nextBusinessDay(minus7)).toISOString(),
      derived_from: { rule: "closing_minus_7_business_days" },
    });
  }

  if (deadlines.length) {
    const ins = await supabase.from("deadlines").insert(
      deadlines.map((d) => ({
        owner_id: ownerId,
        transaction_id: transactionId,
        kind: d.kind,
        label: d.label,
        due_at: d.due_at,
        all_day: true,
        source: "system",
        derived_from: d.derived_from,
      })),
    );
    if (ins.error) throw new Error(ins.error.message);
  }
}
