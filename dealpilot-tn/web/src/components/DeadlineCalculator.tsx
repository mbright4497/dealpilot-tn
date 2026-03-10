// DeadlineCalculator.tsx
import React, { useEffect, useMemo, useState } from "react";
import { calculateTNDeadlines } from "@/lib/tn-deadlines";

type DeadlineStatus = "overdue" | "due_soon" | "upcoming" | "future";

type PortfolioDeadline = {
  dealId: string;
  address: string;
  client?: string | null;
  dealStatus?: string | null;

  deadlineKey: string; // e.g., "inspection_end"
  deadlineName: string; // e.g., "Inspection Contingency Ends"
  dueDate: string; // ISO date or datetime
};

type PortfolioResponse = {
  items: PortfolioDeadline[];
  generatedAt: string; // ISO
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toDateOnlyISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(iso: string) {
  const d = parseDate(iso);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDays(from: Date, to: Date) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  const ms = b - a;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function urgencyBucket(daysRemaining: number): DeadlineStatus {
  if (daysRemaining < 0) return "overdue";
  if (daysRemaining <= 3) return "due_soon";
  if (daysRemaining <= 7) return "upcoming";
  return "future";
}

function urgencyMeta(status: DeadlineStatus) {
  switch (status) {
    case "overdue":
      return {
        ring: "ring-red-500/40",
        border: "border-red-500/30",
        badge: "bg-red-500/15 text-red-100 border-red-500/30",
        dot: "bg-red-400",
        label: "Overdue",
      };
    case "due_soon":
      return {
        ring: "ring-orange-500/40",
        border: "border-orange-500/30",
        badge: "bg-orange-500/15 text-orange-100 border-orange-500/30",
        dot: "bg-orange-400",
        label: "Due ≤ 3 days",
      };
    case "upcoming":
      return {
        ring: "ring-yellow-500/40",
        border: "border-yellow-500/30",
        badge: "bg-yellow-500/15 text-yellow-100 border-yellow-500/30",
        dot: "bg-yellow-400",
        label: "Due ≤ 7 days",
      };
    default:
      return {
        ring: "ring-emerald-500/35",
        border: "border-emerald-500/25",
        badge: "bg-emerald-500/15 text-emerald-100 border-emerald-500/25",
        dot: "bg-emerald-400",
        label: "Future",
      };
  }
}

async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || `Request failed (${res.status})`);
  }
}

export default function DeadlineCalculator() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<PortfolioDeadline[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // What-if calculator inputs (deal-like)
  const [bindingDate, setBindingDate] = useState<string>("");
  const [closingDate, setClosingDate] = useState<string>("");
  const [inspectionEndDate, setInspectionEndDate] = useState<string>("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Expected: { items: PortfolioDeadline[], generatedAt: string }
        // No placeholders: this must return real data from Supabase/server.
        const res = await fetch("/api/portfolio-deadlines", { method: "GET" });
        if (!res.ok) throw new Error(await res.text());
        const data = await safeJson<PortfolioResponse>(res);

        if (!alive) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setGeneratedAt(data.generatedAt || null);
      } catch (e: any) {
        if (!alive) return;
        setItems([]);
        setGeneratedAt(null);
        setError(e?.message || "Failed to load portfolio deadlines.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const now = useMemo(() => new Date(), []);

  const enriched = useMemo(() => {
    const out = items
      .map((d) => {
        const due = parseDate(d.dueDate);
        const daysRemaining = due ? diffDays(new Date(), due) : Number.POSITIVE_INFINITY;
        const status = due ? urgencyBucket(daysRemaining) : "future";
        const score = status === "overdue" ? 0 : status === "due_soon" ? 1 : status === "upcoming" ? 2 : 3;

        return {
          ...d,
          due,
          daysRemaining,
          status,
          sortKey: `${score}-${String(daysRemaining).padStart(5, "0")}`,
        };
      })
      .filter((x) => x.due); // only real, parsable deadlines
    out.sort((a, b) => {
      // primary: urgency bucket, then days remaining, then address
      const aScore = a.status === "overdue" ? 0 : a.status === "due_soon" ? 1 : a.status === "upcoming" ? 2 : 3;
      const bScore = b.status === "overdue" ? 0 : b.status === "due_soon" ? 1 : b.status === "upcoming" ? 2 : 3;
      if (aScore !== bScore) return aScore - bScore;
      if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
      return a.address.localeCompare(b.address);
    });
    return out;
  }, [items]);

  const summaryCounts = useMemo(() => {
    const counts = { overdue: 0, due_soon: 0, upcoming: 0, future: 0 };
    for (const x of enriched) {
      counts[x.status]++;
    }
    return counts;
  }, [enriched]);

  const whatIf = useMemo(() => {
    // calculateTNDeadlines is the source of truth for TN logic.
    // This expects your lib to accept deal-like inputs. If your signature differs, adjust here.
    if (!bindingDate && !closingDate && !inspectionEndDate) return null;

    try {
      const result = calculateTNDeadlines({
        binding_date: bindingDate || null,
        closing_date: closingDate || null,
        inspection_end_date: inspectionEndDate || null,
      } as any);

      // Normalize into a list for rendering
      const list: Array<{ name: string; dueDate: string }> = [];
      if (Array.isArray(result)) {
        for (const r of result) {
          if (r?.dueDate) list.push({ name: r.name || r.key || "Deadline", dueDate: r.dueDate });
        }
      } else if (result && typeof result === "object") {
        // common shapes: { deadlines: [...] } or map-like
        const arr = (result as any).deadlines;
        if (Array.isArray(arr)) {
          for (const r of arr) {
            if (r?.dueDate) list.push({ name: r.name || r.key || "Deadline", dueDate: r.dueDate });
          }
        } else {
          // map: key -> date
          for (const [k, v] of Object.entries(result as any)) {
            if (typeof v === "string") list.push({ name: k, dueDate: v });
          }
        }
      }

      // Sort by due date
      list.sort((a, b) => {
        const ad = parseDate(a.dueDate)?.getTime() ?? 0;
        const bd = parseDate(b.dueDate)?.getTime() ?? 0;
        return ad - bd;
      });

      return list;
    } catch {
      return { error: "Unable to calculate deadlines. Check date inputs and tn-deadlines signature." } as any;
    }
  }, [bindingDate, closingDate, inspectionEndDate]);

  return (
    <div className="min-h-full bg-[#1a1a2e] text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#1a1a2e]/80 backdrop-blur">
        <div className="px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-orange-200">
                    <path
                      d="M6 2v4M18 2v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-tight">Deadlines</h1>
                  <p className="text-sm text-gray-300">
                    Portfolio-grade urgency sorting + a TN what-if calculator. Data-dense, zero fluff.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-300">
                <span className="px-2 py-1 rounded-lg bg-[#16213e] border border-white/10">
                  Now: <span className="text-white font-medium">{now.toLocaleString()}</span>
                </span>
                <span className="px-2 py-1 rounded-lg bg-[#16213e] border border-white/10">
                  Generated: <span className="text-white font-medium">{generatedAt ? new Date(generatedAt).toLocaleString() : "—"}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-2 rounded-xl bg-[#16213e] border border-white/10 text-xs text-gray-200">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  Overdue <span className="text-white font-semibold">{summaryCounts.overdue}</span>
                </span>
              </span>
              <span className="px-3 py-2 rounded-xl bg-[#16213e] border border-white/10 text-xs text-gray-200">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-400" />
                  ≤ 3 days <span className="text-white font-semibold">{summaryCounts.due_soon}</span>
                </span>
              </span>
              <span className="px-3 py-2 rounded-xl bg-[#16213e] border border-white/10 text-xs text-gray-200">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />
                  ≤ 7 days <span className="text-white font-semibold">{summaryCounts.upcoming}</span>
                </span>
              </span>
              <span className="px-3 py-2 rounded-xl bg-[#16213e] border border-white/10 text-xs text-gray-200">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Future <span className="text-white font-semibold">{summaryCounts.future}</span>
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6 space-y-8">
        {/* Portfolio Overview */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-200 uppercase">Portfolio deadline overview</h2>
            <div className="text-xs text-gray-400">
              {loading ? "Loading…" : error ? "Error" : `${enriched.length} upcoming deadlines`}
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-100">
              {error}
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#16213e] p-5 text-sm text-gray-300">
              Pulling portfolio deadlines…
            </div>
          ) : enriched.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {enriched.map((d) => {
                const meta = urgencyMeta(d.status);
                const days = d.daysRemaining;
                const daysLabel =
                  days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today" : `${days} days remaining`;

                return (
                  <div
                    key={`${d.dealId}-${d.deadlineKey}-${d.dueDate}`}
                    className={cx(
                      "rounded-2xl border bg-[#16213e] overflow-hidden ring-1",
                      meta.border,
                      meta.ring
                    )}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{d.address}</div>
                          <div className="mt-1 text-xs text-gray-300 truncate">
                            {d.client ? `Client: ${d.client}` : "Client: —"}{" "}
                            <span className="text-gray-500">·</span>{" "}
                            {d.dealStatus ? `Status: ${d.dealStatus}` : "Status: —"}
                          </div>
                        </div>

                        <span className={cx("inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs", meta.badge)}>
                          <span className={cx("h-1.5 w-1.5 rounded-full", meta.dot)} />
                          {meta.label}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/10 bg-[#0f3460]/60 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-gray-400">Deadline</div>
                          <div className="mt-1 text-sm text-white font-semibold truncate">{d.deadlineName}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-[#0f3460]/60 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-gray-400">Due</div>
                          <div className="mt-1 text-sm text-white font-semibold">{formatDate(d.dueDate)}</div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-300">
                        <span className="inline-flex items-center gap-2">
                          <span className={cx("h-2 w-2 rounded-full", meta.dot)} />
                          {daysLabel}
                        </span>
                        <span className="text-gray-500 font-mono">{d.deadlineKey}</span>
                      </div>
                    </div>

                    <div className="px-4 py-3 bg-[#0f3460]/40 border-t border-white/10 flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        Deal ID: <span className="text-gray-300 font-mono">{d.dealId}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // If your app supports transaction drill-in via view state, swap this with your navigation handler.
                          // Keeping this purely API-wired and dependency-free.
                          // SPA navigation: emit event for app to open deal in chat/transaction detail
                          if(typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('eva:viewDeal', { detail: { id: d.dealId } }));
                        }}
                        className="rounded-xl bg-[#16213e] border border-white/10 px-3 py-1.5 text-xs text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                      >
                        Open deal
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#16213e] p-5 text-sm text-gray-300">
              No upcoming deadlines found in active transactions.
            </div>
          )}
        </section>

        {/* Standalone What-If Calculator */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-200 uppercase">What-if calculator</h2>
            <div className="text-xs text-gray-400">Uses calculateTNDeadlines</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#16213e] overflow-hidden">
            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-200 font-medium">Binding date</label>
                  <div className="mt-2">
                    <input
                      type="date"
                      value={bindingDate}
                      onChange={(e) => setBindingDate(e.target.value)}
                      className="w-full rounded-xl bg-[#0f3460] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-200 font-medium">Inspection end date</label>
                  <div className="mt-2">
                    <input
                      type="date"
                      value={inspectionEndDate}
                      onChange={(e) => setInspectionEndDate(e.target.value)}
                      className="w-full rounded-xl bg-[#0f3460] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-200 font-medium">Closing date</label>
                  <div className="mt-2">
                    <input
                      type="date"
                      value={closingDate}
                      onChange={(e) => setClosingDate(e.target.value)}
                      className="w-full rounded-xl bg-[#0f3460] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setBindingDate(toDateOnlyISO(today));
                  }}
                  className="rounded-xl bg-[#0f3460] border border-white/10 px-3 py-2 text-xs text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                >
                  Set binding = today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBindingDate("");
                    setInspectionEndDate("");
                    setClosingDate("");
                  }}
                  className="rounded-xl bg-[#0f3460] border border-white/10 px-3 py-2 text-xs text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                >
                  Reset
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f3460]/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Calculated deadlines</div>
                  <div className="text-xs text-gray-400">Sorted by due date</div>
                </div>

                <div className="mt-3">
                  {whatIf && (whatIf as any).error ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                      {(whatIf as any).error}
                    </div>
                  ) : whatIf && Array.isArray(whatIf) && whatIf.length ? (
                    <div className="space-y-2">
                      {whatIf.map((x) => {
                        const due = parseDate(x.dueDate);
                        if (!due) return null;
                        const daysRemaining = diffDays(new Date(), due);
                        const status = urgencyBucket(daysRemaining);
                        const meta = urgencyMeta(status);
                        const daysLabel =
                          daysRemaining < 0
                            ? `${Math.abs(daysRemaining)} days overdue`
                            : daysRemaining === 0
                            ? "Due today"
                            : `${daysRemaining} days remaining`;

                        return (
                          <div
                            key={`${x.name}-${x.dueDate}`}
                            className={cx("rounded-xl border bg-[#16213e] p-3 flex items-center justify-between gap-3", meta.border)}
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{x.name}</div>
                              <div className="text-xs text-gray-400">{daysLabel}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cx("inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs", meta.badge)}>
                                <span className={cx("h-1.5 w-1.5 rounded-full", meta.dot)} />
                                {meta.label}
                              </span>
                              <span className="px-3 py-1.5 rounded-xl bg-[#0f3460] border border-white/10 text-xs text-gray-200">
                                {formatDate(x.dueDate)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-300">
                      Enter at least one date above to calculate Tennessee deadlines.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/10 bg-[#0f3460]/60">
              <div className="text-xs text-gray-300">
                This calculator is deterministic. Your <span className="text-white font-medium">tn-deadlines</span> module is the single source of truth.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
