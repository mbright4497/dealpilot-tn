// components/dashboard/DashboardV2.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Tx = {
  id: string;
  status: "new" | "under_contract" | "inspection" | "appraisal" | "clear_to_close" | "closed" | "cancelled";
  address: string;
  city: string | null;
  state: string | null;
  progress_percent: number;
  health_status: "healthy" | "attention" | "at_risk";
  health_score: number;
  updated_at: string;
  closing_date: string | null;
  inspection_end_date: string | null;
};

type Briefing = {
  dateISO: string;
  vibe: "calm" | "executive" | "friendly_tn" | "joyful" | "straight";
  headline: string;
  prepared: { deadlinesReviewed: number; tasksQueued: number; draftsReady: number };
  spotlight: null | {
    transactionId: string | null;
    title: string;
    whyItMatters: string;
    nextBestAction: { label: string; actionUrl: string };
  };
  urgent: Array<{ transactionId: string; title: string; dueAtISO: string; severity: "high" | "medium"; actionUrl: string }>;
  decisions: Array<{ transactionId: string | null; question: string; options: string[]; actionUrl: string }>;
  wins: Array<{ transactionId: string | null; message: string }>;
  nextMoves: Array<{ transactionId: string | null; label: string; actionUrl: string; etaMinutes: number }>;
};

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-200">{children}</span>;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#16213e] p-4 shadow">
      <div className="text-xs text-gray-300">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function SeverityDot({ s }: { s: "high" | "medium" }) {
  const cls = s === "high" ? "bg-rose-500" : "bg-amber-500";
  return <span className={`h-2 w-2 rounded-full ${cls}`} />;
}

export function DashboardV2() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/transactions", { method: "GET" });
      const json = await res.json();
      if (res.ok) setTxs(json.transactions ?? []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingBrief(true);
      const res = await fetch("/api/ai/daily-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysAhead: 14 }),
      });
      const json = await res.json();
      if (res.ok) setBriefing(json.briefing);
      setLoadingBrief(false);
    })();
  }, []);

  const counts = useMemo(() => {
    const base = { new: 0, under_contract: 0, inspection: 0, appraisal: 0, clear_to_close: 0, closed: 0 };
    for (const t of txs) {
      if (t.status in base) (base as any)[t.status] += 1;
    }
    return base;
  }, [txs]);

  const atRisk = useMemo(() => txs.filter((t) => t.health_status === "at_risk").length, [txs]);
  const attention = useMemo(() => txs.filter((t) => t.health_status === "attention").length, [txs]);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Mission Control</h1>
          <p className="mt-1 text-sm text-gray-300">
            Eva runs point. You make the decisions. ✅
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill>TN Mode</Pill>
          <Pill>Voice-ready</Pill>
          <Pill>Executive Assist UI</Pill>
          <button
            className="ml-0 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 active:scale-[0.99] md:ml-2"
            onClick={() => (window.location.href = "/transactions/new")}
          >
            New Transaction
          </button>
        </div>
      </div>

      {/* Eva Briefing */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f3460] p-5 shadow">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs text-gray-300">Eva’s Daily Briefing</div>
            <div className="mt-1 text-xl font-semibold text-white">
              {loadingBrief ? "Preparing your morning briefing…" : (briefing?.headline ?? "Briefing unavailable")}
            </div>
            {briefing?.spotlight && (
              <div className="mt-2 text-sm text-gray-200">
                <span className="font-semibold text-white">Spotlight:</span>{" "}
                {briefing.spotlight.title} — {briefing.spotlight.whyItMatters}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Pill>{briefing?.dateISO ?? "—"}</Pill>
            <Pill>Vibe: {briefing?.vibe ?? "executive"}</Pill>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard label="Deadlines reviewed" value={briefing?.prepared.deadlinesReviewed ?? 0} />
          <StatCard label="Tasks queued" value={briefing?.prepared.tasksQueued ?? 0} />
          <StatCard label="Drafts ready" value={briefing?.prepared.draftsReady ?? 0} />
        </div>

        {briefing?.spotlight && (
          <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#16213e] p-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-200">
              <span className="font-semibold text-white">Next best action:</span> {briefing.spotlight.nextBestAction.label}
            </div>
            <button
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.99]"
              onClick={() => (window.location.href = briefing.spotlight!.nextBestAction.actionUrl)}
            >
              Open
            </button>
          </div>
        )}
      </div>

      {/* Portfolio snapshot */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-6">
        <StatCard label="New" value={counts.new} />
        <StatCard label="Under Contract" value={counts.under_contract} />
        <StatCard label="Inspection" value={counts.inspection} />
        <StatCard label="Appraisal" value={counts.appraisal} />
        <StatCard label="Clear to Close" value={counts.clear_to_close} />
        <StatCard label="Closed" value={counts.closed} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#16213e] p-4 shadow">
          <div className="text-xs text-gray-300">Risk radar</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill>At Risk: {atRisk}</Pill>
            <Pill>Attention: {attention}</Pill>
            <Pill>Total Active: {txs.length}</Pill>
          </div>
          <div className="mt-3 text-sm text-gray-300">
            Eva’s rule: no surprises. If something’s off, you’ll see it early — not at closing. 🙂
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#16213e] p-4 shadow md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-gray-300">Urgent window (next 14 days)</div>
              <div className="mt-1 text-lg font-semibold text-white">What Eva wants you to see</div>
            </div>
            <button
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 hover:bg-white/10"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {(briefing?.urgent ?? []).length === 0 && (
              <div className="rounded-xl border border-dashed border-white/15 p-3 text-sm text-gray-300">
                You’re clear right now. Eva’s watching the timeline. ✅
              </div>
            )}

            {(briefing?.urgent ?? []).slice(0, 6).map((u, idx) => (
              <button
                key={idx}
                className="w-full rounded-2xl border border-white/10 bg-[#0f3460] p-3 text-left hover:bg-[#0f3460]/80"
                onClick={() => (window.location.href = u.actionUrl)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <SeverityDot s={u.severity} />
                    <div className="text-sm font-semibold text-white">{u.title}</div>
                  </div>
                  <div className="text-xs text-gray-300">{new Date(u.dueAtISO).toLocaleString()}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {(briefing?.nextMoves ?? []).slice(0, 4).map((m, i) => (
              <button
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10"
                onClick={() => (window.location.href = m.actionUrl)}
              >
                <div className="text-sm font-semibold text-white">{m.label}</div>
                <div className="mt-1 text-xs text-gray-300">ETA: {m.etaMinutes} min</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Wins & Decisions */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#16213e] p-4 shadow">
          <div className="text-xs text-gray-300">Wins</div>
          <div className="mt-1 text-lg font-semibold text-white">Momentum</div>
          <div className="mt-3 space-y-2">
            {(briefing?.wins ?? []).length === 0 && (
              <div className="text-sm text-gray-300">No wins logged yet today — Eva will catch them as you move deals. ✨</div>
            )}
            {(briefing?.wins ?? []).slice(0, 6).map((w, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-[#0f3460] p-3 text-sm text-gray-200">
                {w.message}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#16213e] p-4 shadow">
          <div className="text-xs text-gray-300">Decisions</div>
          <div className="mt-1 text-lg font-semibold text-white">Quick calls, clean timelines</div>
          <div className="mt-3 space-y-2">
            {(briefing?.decisions ?? []).length === 0 && (
              <div className="text-sm text-gray-300">Nothing pending. That’s what calm looks like. 😌</div>
            )}
            {(briefing?.decisions ?? []).slice(0, 4).map((d, i) => (
              <button
                key={i}
                className="w-full rounded-2xl border border-white/10 bg-[#0f3460] p-3 text-left hover:bg-[#0f3460]/80"
                onClick={() => (window.location.href = d.actionUrl)}
              >
                <div className="text-sm font-semibold text-white">{d.question}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {d.options.map((o, j) => (
                    <span key={j} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-200">
                      {o}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
