"use client";

import * as React from "react";

type RiskLevel = "healthy" | "attention" | "at_risk";

type DailyBriefing = {
  summary: string;
  priorities: string[];
  riskLevel: RiskLevel;
};

function riskLabel(level: RiskLevel) {
  switch (level) {
    case "healthy":
      return "Healthy";
    case "attention":
      return "Needs Attention";
    case "at_risk":
      return "At Risk";
  }
}

function riskBadgeClasses(level: RiskLevel) {
  // Dark UI friendly + color-blind safe-ish w/ text
  switch (level) {
    case "healthy":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "attention":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "at_risk":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  }
}

export default function DashboardV2() {
  const [data, setData] = React.useState<DailyBriefing | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [pipelineCounts, setPipelineCounts] = React.useState({ green: 0, yellow: 0, red: 0 });

  // compute pipeline health counts for dashboard mini-cards
  React.useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const res = await fetch('/api/transactions')
        if(!mounted) return
        if(!res.ok) return
        const txs = await res.json()
        // dynamic import to avoid SSR issues
        // @ts-ignore
        const { computeDealHealth } = await import('@/lib/deal-health')
        const counts = { green:0, yellow:0, red:0 }
        for(const t of (Array.isArray(txs)? txs : txs.results || [])){
          try{ const h = computeDealHealth(t); counts[h.color] = (counts[h.color]||0)+1 }catch(e){}
        }
        if(mounted) setPipelineCounts(counts)
      }catch(e){ }
    })()
    return ()=>{ mounted=false }
  },[])

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/daily-briefing", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }

      const json = (await res.json()) as DailyBriefing;

      // Minimal runtime validation to avoid UI explosions
      if (
        !json ||
        typeof json.summary !== "string" ||
        !Array.isArray(json.priorities) ||
        (json.riskLevel !== "healthy" &&
          json.riskLevel !== "attention" &&
          json.riskLevel !== "at_risk")
      ) {
        throw new Error("Invalid response from daily briefing API");
      }

      setData(json);
    } catch (e: any) {
      console.error("DashboardV2 briefing error:", e);
      setError(e?.message || "Failed to load briefing");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-gray-300">ClosingPilot TN</div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Mission Control
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 hover:bg-white/10"
              disabled={loading}
              type="button"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>

            {data?.riskLevel && (
              <span
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                  riskBadgeClasses(data.riskLevel),
                ].join(" ")}
                aria-label={`Portfolio risk level: ${riskLabel(data.riskLevel)}`}
                title={`Portfolio: ${riskLabel(data.riskLevel)}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                Portfolio: {riskLabel(data.riskLevel)}
              </span>
            )}

            {/* Pipeline mini cards */}
            <div className="ml-3 inline-flex items-center gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" /> <div className="text-gray-200">{pipelineCounts.green}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" /> <div className="text-gray-200">{pipelineCounts.yellow}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" /> <div className="text-gray-200">{pipelineCounts.red}</div>
              </div>
            </div>

          </div>
        </div>

        {/* Content */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Daily Briefing */}
          <section className="lg:col-span-2 rounded-2xl bg-[#16213e] p-5 shadow-sm ring-1 ring-white/5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">EVA Daily Briefing</h2>
              <div className="text-xs text-gray-300">
                {loading ? "Updating…" : "Live"}
              </div>
            </div>

            <div className="mt-3">
              {loading && (
                <div className="space-y-3">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                </div>
              )}

              {!loading && error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                  <div className="font-medium">Couldn’t load briefing</div>
                  <div className="mt-1 text-rose-100/80">{error}</div>
                  <button
                    onClick={() => void load()}
                    className="mt-3 rounded-lg border border-rose-200/20 bg-rose-200/10 px-3 py-1.5 text-xs hover:bg-rose-200/15"
                    type="button"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loading && !error && data && (
                <div className="space-y-4">
                  <p className="leading-relaxed text-gray-100/90">
                    {data.summary}
                  </p>

                  <div>
                    <div className="text-sm font-medium text-gray-100">
                      Priority Actions
                    </div>

                    {data.priorities.length === 0 ? (
                      <div className="mt-2 text-sm text-gray-300">
                        No urgent actions right now. Keep cruising. 😎
                      </div>
                    ) : (
                      <ol className="mt-2 space-y-2">
                        {data.priorities.slice(0, 6).map((p, idx) => (
                          <li
                            key={`${idx}-${p}`}
                            className="flex gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/5"
                          >
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-semibold text-orange-200 ring-1 ring-orange-500/20">
                              {idx + 1}
                            </div>
                            <div className="text-sm text-gray-100/90">{p}</div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right rail (placeholder for Phase 1 "Fix Reality") */}
          <aside className="rounded-2xl bg-[#0f3460] p-5 shadow-sm ring-1 ring-white/5">
            <h3 className="text-sm font-semibold text-gray-100">
              Quick Actions
            </h3>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-gray-100 hover:bg-white/10"
                onClick={() => {
                  // Placeholder: wire to modal / route later
                  console.log("Start Transaction");
                }}
              >
                Start Transaction
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-gray-100 hover:bg-white/10"
                onClick={() => {
                  console.log("Calculate Deadlines");
                }}
              >
                Calculate Deadlines
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-gray-100 hover:bg-white/10"
                onClick={() => {
                  console.log("Fill RF401");
                }}
              >
                Fill RF401
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-gray-100 hover:bg-white/10"
                onClick={() => {
                  console.log("View Checklists");
                }}
              >
                View Checklists
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-gray-300">Phase 1: Fix Reality</div>
              <div className="mt-1 text-sm text-gray-100/90">
                This dashboard is now driven by the V2 Daily Briefing API.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
