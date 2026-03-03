'use client'
// FormsFillView.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FORM_LIST } from "@/lib/formSchemas";

type FormCategory = "All" | "Purchase" | "Lease" | "Addendum";

type Deal = {
  id: string;
  address: string;
  client?: string | null;
  status?: string | null;
  binding_date?: string | null;
  closing_date?: string | null;
  inspection_end_date?: string | null;
};

type FormSchema = {
  id: string;
  name: string;
  description: string;
  category: string;
  pages: number;
  fields?: Array<any>;
};

type RecentFormItem = {
  formId: string;
  lastUsedAt: string; // ISO
  status: "blank" | "in_progress" | "completed";
};

type FormProgress = Record<
  string,
  {
    status: "blank" | "in_progress" | "completed";
    updatedAt?: string;
  }
>;

type FieldDef = {
  id: string;
  label: string;
  type?: "text" | "date" | "number" | "select" | "textarea";
  placeholder?: string;
  required?: boolean;
  options?: string[];
  helpText?: string;
};

type FormValues = Record<string, any>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusMeta(status: "blank" | "in_progress" | "completed") {
  switch (status) {
    case "completed":
      return { label: "Completed", dot: "bg-emerald-400", badge: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" };
    case "in_progress":
      return { label: "In progress", dot: "bg-orange-400", badge: "bg-orange-500/15 text-orange-200 border-orange-500/30" };
    default:
      return { label: "Blank", dot: "bg-slate-400", badge: "bg-slate-500/15 text-slate-200 border-slate-500/30" };
  }
}

function categoryMeta(cat: string) {
  const c = (cat || "").toLowerCase();
  if (c.includes("purchase")) return "bg-indigo-500/15 text-indigo-200 border-indigo-500/30";
  if (c.includes("lease")) return "bg-cyan-500/15 text-cyan-200 border-cyan-500/30";
  if (c.includes("addendum")) return "bg-violet-500/15 text-violet-200 border-violet-500/30";
  return "bg-slate-500/15 text-slate-200 border-slate-500/30";
}

async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || `Request failed (${res.status})`);
  }
}

export default function FormsFillView() {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [dealLoading, setDealLoading] = useState(true);

  const [recent, setRecent] = useState<RecentFormItem[]>([]);
  const [progress, setProgress] = useState<FormProgress>({});
  const [metaLoading, setMetaLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FormCategory>("All");

  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [dirty, setDirty] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);

  const forms = FORM_LIST as unknown as FormSchema[];

  const filteredForms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return forms.filter((f) => {
      const catOk = category === "All" ? true : (f.category || "").toLowerCase().includes(category.toLowerCase());
      if (!catOk) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q) ||
        (f.description || "").toLowerCase().includes(q) ||
        (f.category || "").toLowerCase().includes(q)
      );
    });
  }, [forms, query, category]);

  const recentForms = useMemo(() => {
    const map = new Map<string, RecentFormItem>();
    for (const r of recent) map.set(r.formId, r);
    return forms
      .filter((f) => map.has(f.id))
      .map((f) => ({ form: f, meta: map.get(f.id)! }))
      .sort((a, b) => new Date(b.meta.lastUsedAt).getTime() - new Date(a.meta.lastUsedAt).getTime());
  }, [forms, recent]);

  const openForm = useMemo(() => (openFormId ? forms.find((f) => f.id === openFormId) : null), [openFormId, forms]);

  const fieldDefs = useMemo<FieldDef[]>(() => {
    if (!openFormId) return [];
    const fromMap = (FORM_FIELDS as any)?.[openFormId] as FieldDef[] | undefined;
    const fromSchema = (openForm as any)?.fields as FieldDef[] | undefined;
    return (fromMap && Array.isArray(fromMap) ? fromMap : fromSchema) || [];
  }, [openFormId, openForm]);

  const openFormStatus = useMemo(() => {
    const s = progress?.[openFormId || ""]?.status || "blank";
    return s as "blank" | "in_progress" | "completed";
  }, [progress, openFormId]);

  useEffect(() => {
    // Load active deal (no placeholders): the API should return the currently-selected transaction for the user/session.
    // Expected: { deal: Deal | null }
    let alive = true;
    (async () => {
      try {
        setDealLoading(true);
        const res = await fetch("/api/transactions/active", { method: "GET" });
        if (!res.ok) throw new Error(await res.text());
        const data = await safeJson<{ deal: Deal | null }>(res);
        if (!alive) return;
        setActiveDeal(data.deal);
      } catch (e: any) {
        if (!alive) return;
        setActiveDeal(null);
      } finally {
        if (alive) setDealLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    // Load recent forms + progress for the active deal
    let alive = true;
    (async () => {
      try {
        setMetaLoading(true);

        const [recentRes, progressRes] = await Promise.all([
          fetch("/api/forms/recent?limit=6", { method: "GET" }),
          activeDeal?.id ? fetch(`/api/forms/progress?dealId=${encodeURIComponent(activeDeal.id)}`, { method: "GET" }) : null,
        ]);

        if (!recentRes.ok) throw new Error(await recentRes.text());
        const recentData = await safeJson<{ items: RecentFormItem[] }>(recentRes);

        let progressData: { progress: FormProgress } = { progress: {} };
        if (progressRes) {
          if (!progressRes.ok) throw new Error(await progressRes.text());
          progressData = await safeJson<{ progress: FormProgress }>(progressRes);
        }

        if (!alive) return;
        setRecent(recentData.items || []);
        setProgress(progressData.progress || {});
      } catch (e: any) {
        if (!alive) return;
        // Keep UI stable; no fake data.
        setRecent([]);
        setProgress({});
      } finally {
        if (alive) setMetaLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeDeal?.id]);

  useEffect(() => {
    // Keyboard: "/" focuses search like a terminal
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        const editing = tag === "input" || tag === "textarea" || (t as any)?.isContentEditable;
        if (!editing) {
          e.preventDefault();
          searchRef.current?.focus();
        }
      }
      if (e.key === "Escape" && openFormId) {
        e.preventDefault();
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFormId, dirty]);

  async function loadFormDraft(formId: string) {
    // Expected: { values: FormValues, status: "blank"|"in_progress"|"completed" }
    if (!activeDeal?.id) {
      setValues({});
      return;
    }
    const res = await fetch(`/api/forms/draft?dealId=${encodeURIComponent(activeDeal.id)}&formId=${encodeURIComponent(formId)}`, {
      method: "GET",
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await safeJson<{ values: FormValues }>(res);
    setValues(data.values || {});
  }

  async function handleOpen(formId: string) {
    setModalError(null);
    setDirty(false);
    setOpenFormId(formId);
    try {
      setModalBusy(true);
      await loadFormDraft(formId);
    } catch (e: any) {
      setModalError(e?.message || "Failed to load draft.");
      setValues({});
    } finally {
      setModalBusy(false);
    }
  }

  async function handleCloseModal() {
    if (!openFormId) return;
    if (dirty) {
      // We won't show a browser confirm (feels cheap). Save fast instead.
      try {
        setModalBusy(true);
        await handleSaveDraft(openFormId, values, { silent: true });
      } catch {
        // If save fails, still allow close — user can reopen and retry.
      } finally {
        setModalBusy(false);
      }
    }
    setOpenFormId(null);
    setModalError(null);
    setValues({});
    setDirty(false);
  }

  async function handleSaveDraft(formId: string, v: FormValues, opts?: { silent?: boolean }) {
    if (!activeDeal?.id) throw new Error("No active transaction selected.");
    const res = await fetch("/api/forms/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: activeDeal.id, formId, values: v }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await safeJson<{ progress?: FormProgress }>(res);
    if (data.progress) setProgress(data.progress);
    setDirty(false);

    // Refresh recent list after a save (so it becomes “recently used”)
    if (!opts?.silent) {
      try {
        const recentRes = await fetch("/api/forms/recent?limit=6", { method: "GET" });
        if (recentRes.ok) {
          const recentData = await safeJson<{ items: RecentFormItem[] }>(recentRes);
          setRecent(recentData.items || []);
        }
      } catch {
        // ignore
      }
    }
  }

  async function handleDownloadBlank(formId: string) {
    const res = await fetch(`/api/forms/download-blank?formId=${encodeURIComponent(formId)}`, { method: "GET" });
    if (!res.ok) throw new Error(await res.text());
    const data = await safeJson<{ url: string }>(res);
    if (!data.url) throw new Error("No download URL returned.");
    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  async function handleExport(formId: string) {
    if (!activeDeal?.id) throw new Error("No active transaction selected.");
    const res = await fetch("/api/forms/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: activeDeal.id, formId, values }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await safeJson<{ url: string }>(res);
    if (!data.url) throw new Error("No export URL returned.");
    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  async function handleFillWithAI(formId: string) {
    if (!activeDeal?.id) throw new Error("No active transaction selected.");
    const res = await fetch("/api/forms/ai-fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: activeDeal.id, formId, currentValues: values }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await safeJson<{ values: FormValues }>(res);
    setValues((prev) => ({ ...prev, ...(data.values || {}) }));
    setDirty(true);
  }

  function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cx(
          "px-3 py-1.5 rounded-full text-sm border transition",
          active
            ? "bg-orange-500/15 text-orange-200 border-orange-500/40"
            : "bg-[#0f3460]/40 text-gray-200 border-white/10 hover:border-orange-500/30 hover:text-orange-100"
        )}
      >
        {label}
      </button>
    );
  }

  function StatusChip({ status }: { status: "blank" | "in_progress" | "completed" }) {
    const m = statusMeta(status);
    return (
      <span className={cx("inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs", m.badge)}>
        <span className={cx("h-1.5 w-1.5 rounded-full", m.dot)} />
        {m.label}
      </span>
    );
  }

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
                      d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-tight">Forms Library</h1>
                  <p className="text-sm text-gray-300">
                    Executive-grade document workflows — fast, accurate, and transaction-aware.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-300">
                <span className="px-2 py-1 rounded-lg bg-[#16213e] border border-white/10">
                  Active deal:{" "}
                  <span className="text-white font-medium">
                    {dealLoading ? "Loading…" : activeDeal?.address ? activeDeal.address : "None selected"}
                  </span>
                </span>
                {activeDeal?.client ? (
                  <span className="px-2 py-1 rounded-lg bg-[#16213e] border border-white/10">
                    Client: <span className="text-white font-medium">{activeDeal.client}</span>
                  </span>
                ) : null}
                <span className="px-2 py-1 rounded-lg bg-[#16213e] border border-white/10">
                  Tip: press <span className="text-white font-semibold">/</span> to search
                </span>
              </div>
            </div>

            <div className="w-full lg:w-[520px]">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search forms, codes, descriptions…"
                    className="w-full rounded-xl bg-[#16213e] border border-white/10 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-400 outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                    searchRef.current?.focus();
                  }}
                  className="rounded-xl bg-[#16213e] border border-white/10 px-3 py-2.5 text-sm text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                >
                  Reset
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill label="All" active={category === "All"} onClick={() => setCategory("All")} />
                <Pill label="Purchase" active={category === "Purchase"} onClick={() => setCategory("Purchase")} />
                <Pill label="Lease" active={category === "Lease"} onClick={() => setCategory("Lease")} />
                <Pill label="Addendum" active={category === "Addendum"} onClick={() => setCategory("Addendum")} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6 space-y-8">
        {/* Recently Used */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-200 uppercase">Recently used</h2>
            <div className="text-xs text-gray-400">
              {metaLoading ? "Syncing…" : recentForms.length ? `${recentForms.length} forms` : "No recent activity"}
            </div>
          </div>

          {recentForms.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {recentForms.map(({ form, meta }) => {
                const st = meta.status;
                const pm = statusMeta(st);
                return (
                  <div key={form.id} className="rounded-2xl border border-white/10 bg-[#16213e] overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-orange-200 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg">
                              {form.id}
                            </span>
                            <span className={cx("text-xs px-2 py-1 rounded-lg border", categoryMeta(form.category))}>
                              {form.category || "General"}
                            </span>
                          </div>
                          <div className="mt-2 font-semibold truncate">{form.name}</div>
                          <div className="mt-1 text-sm text-gray-300 line-clamp-2">{form.description}</div>
                        </div>
                        <span className={cx("inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs", pm.badge)}>
                          <span className={cx("h-1.5 w-1.5 rounded-full", pm.dot)} />
                          {pm.label}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                        <span>{form.pages} pages</span>
                        <span>Last used: {formatDateTime(meta.lastUsedAt)}</span>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpen(form.id)}
                          className="flex-1 rounded-xl bg-orange-500 text-black font-semibold px-3 py-2 text-sm hover:opacity-95 transition"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await handleDownloadBlank(form.id);
                            } catch (e: any) {
                              // minimal, no toasts here to keep component dependency-free
                              alert(e?.message || "Download failed.");
                            }
                          }}
                          className="rounded-xl bg-[#0f3460] border border-white/10 px-3 py-2 text-sm text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                        >
                          Blank
                        </button>
                      </div>
                    </div>

                    <div className="px-4 py-3 bg-[#0f3460]/40 border-t border-white/10 flex items-center justify-between text-xs text-gray-300">
                      <span className="flex items-center gap-2">
                        <span className={cx("h-2 w-2 rounded-full", pm.dot)} />
                        Status: {pm.label}
                      </span>
                      <span className="text-gray-400">Quick access</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#16213e] p-5 text-sm text-gray-300">
              No recent forms yet. Open any form below to start building a transaction-ready library.
            </div>
          )}
        </section>

        {/* Library Grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-200 uppercase">Library</h2>
            <div className="text-xs text-gray-400">{filteredForms.length} forms</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredForms.map((f) => {
              const st = progress?.[f.id]?.status || "blank";
              return (
                <div key={f.id} className="rounded-2xl border border-white/10 bg-[#16213e] overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-orange-200 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg">
                            {f.id}
                          </span>
                          <span className={cx("text-xs px-2 py-1 rounded-lg border", categoryMeta(f.category))}>
                            {f.category || "General"}
                          </span>
                        </div>
                        <div className="mt-2 font-semibold truncate">{f.name}</div>
                        <div className="mt-1 text-sm text-gray-300 line-clamp-2">{f.description}</div>
                      </div>
                      <StatusChip status={st as any} />
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                      <span>{f.pages} pages</span>
                      <span>
                        Updated: {progress?.[f.id]?.updatedAt ? formatDateTime(progress[f.id].updatedAt) : "—"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpen(f.id)}
                        className="flex-1 rounded-xl bg-orange-500 text-black font-semibold px-3 py-2 text-sm hover:opacity-95 transition"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await handleDownloadBlank(f.id);
                          } catch (e: any) {
                            alert(e?.message || "Download failed.");
                          }
                        }}
                        className="rounded-xl bg-[#0f3460] border border-white/10 px-3 py-2 text-sm text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                      >
                        Download Blank
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-[#0f3460]/40 border-t border-white/10 flex items-center justify-between text-xs text-gray-300">
                    <span className="text-gray-400">AI-ready · Deal-aware</span>
                    <span className="text-gray-400">{(FORM_FIELDS as any)?.[f.id]?.length ?? (f.fields?.length ?? 0)} fields</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Modal */}
      {openFormId && openForm ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={handleCloseModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0f3460] shadow-2xl overflow-hidden">
              {/* Modal header */}
              <div className="px-5 py-4 bg-[#16213e] border-b border-white/10 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-orange-200 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg">
                      {openForm.id}
                    </span>
                    <span className={cx("text-xs px-2 py-1 rounded-lg border", categoryMeta(openForm.category))}>
                      {openForm.category || "General"}
                    </span>
                    <StatusChip status={openFormStatus} />
                  </div>
                  <div className="mt-2 text-lg font-semibold truncate">{openForm.name}</div>
                  <div className="mt-1 text-sm text-gray-300 line-clamp-2">{openForm.description}</div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-300">
                    <span className="px-2 py-1 rounded-lg bg-[#0f3460] border border-white/10">
                      Active deal:{" "}
                      <span className="text-white font-medium">
                        {activeDeal?.address ? activeDeal.address : "None"}
                      </span>
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-[#0f3460] border border-white/10">
                      Binding: <span className="text-white font-medium">{formatDate(activeDeal?.binding_date)}</span>
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-[#0f3460] border border-white/10">
                      Inspection ends:{" "}
                      <span className="text-white font-medium">{formatDate(activeDeal?.inspection_end_date)}</span>
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-[#0f3460] border border-white/10">
                      Closing: <span className="text-white font-medium">{formatDate(activeDeal?.closing_date)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl bg-[#0f3460] border border-white/10 px-3 py-2 text-sm text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
                <div className="p-5">
                  {modalError ? (
                    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                      {modalError}
                    </div>
                  ) : null}

                  {modalBusy ? (
                    <div className="rounded-2xl border border-white/10 bg-[#16213e] p-5 text-sm text-gray-300">
                      Loading form draft…
                    </div>
                  ) : fieldDefs.length ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-[#16213e] p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">Fields</div>
                          <div className="text-xs text-gray-400">{fieldDefs.length} inputs</div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {fieldDefs.map((fd) => {
                            const v = values?.[fd.id] ?? "";
                            const common =
                              "w-full rounded-xl bg-[#0f3460] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-gray-400 outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10";
                            return (
                              <div key={fd.id} className="min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <label className="text-sm text-gray-200 font-medium">
                                    {fd.label}
                                    {fd.required ? <span className="text-orange-300"> *</span> : null}
                                  </label>
                                  <span className="text-xs text-gray-500 font-mono">{fd.id}</span>
                                </div>
                                <div className="mt-2">
                                  {fd.type === "textarea" ? (
                                    <textarea
                                      value={String(v)}
                                      onChange={(e) => {
                                        setValues((prev) => ({ ...prev, [fd.id]: e.target.value }));
                                        setDirty(true);
                                      }}
                                      rows={4}
                                      placeholder={fd.placeholder || ""}
                                      className={common}
                                    />
                                  ) : fd.type === "select" && Array.isArray(fd.options) ? (
                                    <select
                                      value={String(v)}
                                      onChange={(e) => {
                                        setValues((prev) => ({ ...prev, [fd.id]: e.target.value }));
                                        setDirty(true);
                                      }}
                                      className={common}
                                    >
                                      <option value="">Select…</option>
                                      {fd.options.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      value={String(v)}
                                      onChange={(e) => {
                                        setValues((prev) => ({ ...prev, [fd.id]: e.target.value }));
                                        setDirty(true);
                                      }}
                                      type={fd.type === "number" ? "number" : fd.type === "date" ? "date" : "text"}
                                      placeholder={fd.placeholder || ""}
                                      className={common}
                                    />
                                  )}
                                </div>
                                {fd.helpText ? <div className="mt-1 text-xs text-gray-400">{fd.helpText}</div> : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-[#16213e] p-5 text-sm text-gray-300">
                      No fields configured for this form. Add fields in <span className="text-white font-medium">FORM_FIELDS</span> or the schema.
                    </div>
                  )}
                </div>

                {/* Actions panel */}
                <div className="p-5 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#16213e]">
                  <div className="text-sm font-semibold">Executive Actions</div>
                  <div className="mt-1 text-xs text-gray-400">Fast, traceable, and transaction-aware.</div>

                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      disabled={modalBusy || !openFormId || !activeDeal?.id}
                      onClick={async () => {
                        try {
                          setModalError(null);
                          setModalBusy(true);
                          await handleFillWithAI(openFormId);
                        } catch (e: any) {
                          setModalError(e?.message || "AI fill failed.");
                        } finally {
                          setModalBusy(false);
                        }
                      }}
                      className={cx(
                        "w-full rounded-xl px-4 py-3 text-sm font-semibold transition",
                        modalBusy || !activeDeal?.id
                          ? "bg-orange-500/30 text-black/60 cursor-not-allowed"
                          : "bg-orange-500 text-black hover:opacity-95"
                      )}
                    >
                      Fill with AI (active deal)
                    </button>

                    <button
                      type="button"
                      disabled={modalBusy || !openFormId}
                      onClick={async () => {
                        try {
                          setModalError(null);
                          setModalBusy(true);
                          await handleSaveDraft(openFormId, values);
                        } catch (e: any) {
                          setModalError(e?.message || "Save failed.");
                        } finally {
                          setModalBusy(false);
                        }
                      }}
                      className={cx(
                        "w-full rounded-xl border px-4 py-3 text-sm font-semibold transition",
                        modalBusy ? "border-white/10 text-gray-500 cursor-not-allowed bg-[#0f3460]/40" : "border-white/10 text-gray-100 bg-[#0f3460] hover:border-orange-500/30"
                      )}
                    >
                      Save Draft
                    </button>

                    <button
                      type="button"
                      disabled={modalBusy || !openFormId || !activeDeal?.id}
                      onClick={async () => {
                        try {
                          setModalError(null);
                          setModalBusy(true);
                          await handleExport(openFormId);
                        } catch (e: any) {
                          setModalError(e?.message || "Export failed.");
                        } finally {
                          setModalBusy(false);
                        }
                      }}
                      className={cx(
                        "w-full rounded-xl border px-4 py-3 text-sm font-semibold transition",
                        modalBusy || !activeDeal?.id
                          ? "border-white/10 text-gray-500 cursor-not-allowed bg-[#0f3460]/40"
                          : "border-white/10 text-gray-100 bg-[#0f3460] hover:border-orange-500/30"
                      )}
                    >
                      Export / Generate PDF
                    </button>

                    <button
                      type="button"
                      disabled={modalBusy || !openFormId}
                      onClick={async () => {
                        try {
                          await handleDownloadBlank(openFormId);
                        } catch (e: any) {
                          setModalError(e?.message || "Download failed.");
                        }
                      }}
                      className={cx(
                        "w-full rounded-xl border px-4 py-3 text-sm font-semibold transition",
                        modalBusy ? "border-white/10 text-gray-500 cursor-not-allowed bg-[#0f3460]/40" : "border-white/10 text-gray-100 bg-[#0f3460] hover:border-orange-500/30"
                      )}
                    >
                      Download Blank
                    </button>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f3460]/50 p-4">
                    <div className="text-xs font-semibold tracking-wide text-gray-200 uppercase">Operational Notes</div>
                    <ul className="mt-2 space-y-2 text-xs text-gray-300">
                      <li className="flex gap-2">
                        <span className="text-orange-200">•</span>
                        <span>AI Fill reads the active transaction + current draft values to minimize overwrites.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-orange-200">•</span>
                        <span>Drafts save per deal + per form. Export is always generated from latest values.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-orange-200">•</span>
                        <span>Status updates are server-authoritative (no fake state).</span>
                      </li>
                    </ul>
                  </div>

                  {!activeDeal?.id ? (
                    <div className="mt-4 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-xs text-orange-100">
                      No active transaction selected — AI Fill & Export are disabled until a deal is active.
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-5 py-3 border-t border-white/10 bg-[#0f3460]/60 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  {dirty ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-orange-400" />
                      Unsaved changes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Draft synced
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl bg-[#16213e] border border-white/10 px-4 py-2 text-sm text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
