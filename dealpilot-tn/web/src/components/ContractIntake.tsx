// src/components/ContractIntake.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Loader2,
  Pencil,
  CheckCircle2,
  Circle,
  X,
  AlertTriangle,
  Info,
} from "lucide-react";

type Severity = "error" | "warning" | "info";

type ParsedResponse = {
  fields: {
    propertyAddress: string | null;
    buyerNames: string[];
    sellerNames: string[];
    purchasePrice: number | null;
    earnestMoney: number | null;
    bindingDate: string | null;
    closingDate: string | null;
    inspectionEndDate: string | null;
    financingContingencyDate: string | null;
    specialStipulations: string | null;
    contractType: "buyer" | "seller" | "unknown";
  };
  issues: Array<{
    field: string;
    severity: Severity;
    message: string;
    section: string;
  }>;
  timeline: Array<{
    label: string;
    date: string | null;
    status: "pending" | "complete";
  }>;
};

type Props = {
  onConfirm: (data: ParsedResponse) => void;
  onCancel: () => void;
};

type StepId = 1 | 2 | 3 | 4;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function badgeForSeverity(sev: Severity) {
  if (sev === "error") return "bg-red-500/15 text-red-100 border-red-500/30";
  if (sev === "warning") return "bg-yellow-500/15 text-yellow-100 border-yellow-500/30";
  return "bg-blue-500/15 text-blue-100 border-blue-500/30";
}

function IconForSeverity({ sev }: { sev: Severity }) {
  if (sev === "error") return <AlertTriangle size={14} className="text-red-300" />;
  if (sev === "warning") return <AlertTriangle size={14} className="text-yellow-300" />;
  return <Info size={14} className="text-blue-300" />;
}

function formatMoney(n: number | null) {
  if (n === null || typeof n !== "number" || Number.isNaN(n)) return "";
  return String(n);
}

async function fileToBase64(file: File, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (!onProgress) return;
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 25); // first quarter is read
        onProgress(Math.min(25, Math.max(1, pct)));
      }
    };

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? (result.split(",").pop() || "") : result;
      resolve(base64);
    };

    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(file);
  });
}

function Stepper({ step }: { step: StepId }) {
  const steps = [
    { id: 1, label: "Upload" },
    { id: 2, label: "Review" },
    { id: 3, label: "Timeline" },
    { id: 4, label: "Confirm" },
  ] as const;

  return (
    <div className="flex items-center gap-3">
      {steps.map((s, idx) => {
        const active = step === s.id;
        const done = step > s.id;
        return (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-2">
              {done ? (
                <CheckCircle2 size={18} className="text-orange-500" />
              ) : (
                <Circle size={18} className={active ? "text-orange-500" : "text-gray-500"} />
              )}
              <span className={cx("text-sm", active ? "text-white" : "text-gray-400")}>{s.label}</span>
            </div>
            {idx < steps.length - 1 && <div className="h-px w-10 bg-white/10" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function RevaHeader({ title, subtitle, onCancel }: { title: string; subtitle: string; onCancel: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-orange-500 text-black font-bold flex items-center justify-center">
          R
        </div>
        <div>
          <div className="text-white font-semibold">{title}</div>
          <div className="text-sm text-gray-300">{subtitle}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-2 rounded-lg bg-[#16213e] border border-white/10 px-3 py-2 text-sm text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
      >
        <X size={16} />
        Cancel
      </button>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#16213e] border border-white/10 rounded-xl p-4">{children}</div>;
}

function FieldCard({
  label,
  value,
  editable,
  onEdit,
  onChange,
  onBlur,
  isEditing,
  inputType,
  placeholder,
}: {
  label: string;
  value: string;
  editable: boolean;
  onEdit: () => void;
  onChange: (v: string) => void;
  onBlur: () => void;
  isEditing: boolean;
  inputType?: "text" | "date" | "number";
  placeholder?: string;
}) {
  return (
    <div className="bg-[#0f3460] border border-white/10 rounded-lg p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-gray-300">{label}</div>
        {editable && (
          <button
            type="button"
            onClick={onEdit}
            className="text-gray-300 hover:text-orange-100 transition"
            aria-label={`Edit ${label}`}
            title={`Edit ${label}`}
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      <div className="mt-2">
        {isEditing ? (
          <input
            type={inputType || "text"}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className="w-full rounded-lg bg-[#1a1a2e] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10"
          />
        ) : (
          <div className="text-sm text-white break-words">{value || <span className="text-gray-500">—</span>}</div>
        )}
      </div>
    </div>
  );
}

export default function ContractIntake({ onConfirm, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<StepId>(1);

  // Upload state
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Parse state
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedResponse | null>(null);

  // Editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const issuesBySeverity = useMemo(() => {
    const list = parsed?.issues || [];
    return {
      error: list.filter((i) => i.severity === "error"),
      warning: list.filter((i) => i.severity === "warning"),
      info: list.filter((i) => i.severity === "info"),
    };
  }, [parsed]);

  function resetAll() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setStep(1);
    setDragging(false);
    setFile(null);
    setPdfUrl(null);
    setUploadProgress(0);
    setParsing(false);
    setParseError(null);
    setParsed(null);
    setEditingKey(null);
  }

  async function handleFile(selected: File) {
    setParseError(null);

    if (!selected || selected.type !== "application/pdf") {
      setParseError("Please upload a PDF contract.");
      return;
    }

    // PDF viewer: must work immediately
    const url = URL.createObjectURL(selected);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    setFile(selected);
    setPdfUrl(url);
    setUploadProgress(0);
    setParsed(null);

    // Convert to base64 + call parse
    setParsing(true);
    try {
      setUploadProgress(5);
      const base64 = await fileToBase64(selected, (pct) => setUploadProgress(pct));

      setUploadProgress(35);

      const res = await fetch("/api/contract-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64 }),
      });

      setUploadProgress(75);

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Parse failed (${res.status})`);
      }

      const data = (await res.json()) as ParsedResponse;

      // Ensure the shape exists (no placeholders; just sanity)
      if (!data || typeof data !== "object" || !("fields" in data)) {
        throw new Error("Invalid parse response.");
      }

      setParsed(data);
      try{ localStorage.setItem('pending_parsed_deal', JSON.stringify(data)) }catch(e){}
      setUploadProgress(100);
      setStep(2);
    } catch (e: any) {
      setParseError(e?.message || "Reva couldn't parse this contract.");
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  function updateField<K extends keyof ParsedResponse["fields"]>(key: K, rawValue: string) {
    if (!parsed) return;

    const next = { ...parsed };
    const fields = { ...next.fields };

    if (key === "buyerNames" || key === "sellerNames") {
      const arr = rawValue
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      (fields as any)[key] = arr;
    } else if (key === "purchasePrice" || key === "earnestMoney") {
      const num = rawValue.trim() === "" ? null : Number(rawValue);
      (fields as any)[key] = Number.isFinite(num as number) ? num : null;
    } else if (key === "contractType") {
      const v = rawValue.trim().toLowerCase();
      (fields as any)[key] = v === "buyer" || v === "seller" ? v : "unknown";
    } else {
      (fields as any)[key] = rawValue.trim() === "" ? null : rawValue;
    }

    next.fields = fields;
    setParsed(next);
    try{ localStorage.setItem('pending_parsed_deal', JSON.stringify(next)) }catch(e){}
  }

  function updateTimeline(idx: number, patch: Partial<ParsedResponse["timeline"][number]>) {
    if (!parsed) return;
    const next = { ...parsed, timeline: parsed.timeline.map((t, i) => (i === idx ? { ...t, ...patch } : t)) };
    setParsed(next);
    try{ localStorage.setItem('pending_parsed_deal', JSON.stringify(next)) }catch(e){}
  }

  function addTimelineEvent() {
    if (!parsed) return;
    setParsed({
      ...parsed,
      timeline: [
        ...parsed.timeline,
        { label: "New Event", date: null, status: "pending" },
      ],
    });
  }

  function removeTimelineEvent(idx: number) {
    if (!parsed) return;
    setParsed({ ...parsed, timeline: parsed.timeline.filter((_, i) => i !== idx) });
  }

  const revaSubtitle = useMemo(() => {
    if (step === 1) return "Upload your RF401 PDF. I’ll read it and build the transaction draft.";
    if (step === 2) return "I found the following details in your contract. Review and edit anything that looks off.";
    if (step === 3) return "Here’s your timeline. Adjust labels/dates as needed before creating the transaction.";
    return "Final review. If this looks right, create the transaction.";
  }, [step]);

  return (
    <div className="bg-[#1a1a2e] text-white border border-white/10 rounded-2xl p-6">
      <div className="flex flex-col gap-4">
        <RevaHeader
          title="AI Transaction Intake"
          subtitle={revaSubtitle}
          onCancel={() => {
            resetAll();
            onCancel();
          }}
        />

        <div className="flex items-center justify-between gap-4">
          <Stepper step={step} />
          {file?.name ? (
            <div className="text-xs text-gray-300 inline-flex items-center gap-2 rounded-lg bg-[#16213e] border border-white/10 px-3 py-2">
              <FileText size={14} className="text-gray-300" />
              <span className="truncate max-w-[260px]">{file.name}</span>
            </div>
          ) : (
            <div />
          )}
        </div>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <div
                onClick={openPicker}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cx(
                  "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition",
                  dragging ? "border-orange-500 bg-[#0f3460]/30" : "border-white/10 bg-[#16213e]"
                )}
              >
                {!parsing ? (
                  <>
                    <UploadCloud size={44} className="mx-auto mb-4 text-gray-400" />
                    <div className="text-white font-semibold">Drag & drop your RF401 PDF</div>
                    <div className="text-sm text-gray-300 mt-1">or click to browse</div>
                    {parseError ? (
                      <div className="mt-4 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        {parseError}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-orange-500 mb-3" size={36} />
                    <div className="text-white font-semibold">Eva is thinking…</div>
                    <div className="text-sm text-gray-300 mt-1">Reading your contract and extracting RF401 fields</div>

                    <div className="w-full max-w-xl bg-white/10 h-2 rounded mt-5 overflow-hidden">
                      <div
                        className="bg-orange-500 h-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, uploadProgress))}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-gray-400">{uploadProgress}%</div>

                    {parseError ? (
                      <div className="mt-4 w-full max-w-xl text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        {parseError}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </Card>
          </div>
        )}

        {/* STEP 2: Review (Split View) */}
        {step === 2 && parsed && file && pdfUrl && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-4">
            {/* LEFT: PDF Viewer */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">Contract Preview</div>
                <button
                  type="button"
                  onClick={() => {
                    // allow replacing file without leaving flow
                    setStep(1);
                  }}
                  className="text-xs rounded-lg bg-[#0f3460] border border-white/10 px-3 py-2 text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                >
                  Replace PDF
                </button>
              </div>

              <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0f3460]">
                {/* Works immediately via object URL */}
                <iframe
                  src={pdfUrl}
                  className="w-full h-[75vh]"
                  title="Contract PDF Viewer"
                />
              </div>
            </Card>

            {/* RIGHT: Extracted Fields */}
            <Card>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-sm font-semibold">Extracted Fields</div>
                  <div className="text-xs text-gray-400">
                    Editable. Pencil toggles edit mode. Arrays are comma-separated.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-lg bg-orange-500 text-black px-4 py-2 text-sm font-semibold hover:opacity-95 transition"
                  >
                    Continue
                  </button>
                </div>
              </div>

              {/* Issues */}
              {(parsed.issues?.length || 0) > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="text-xs font-semibold tracking-wide text-gray-200 uppercase">Issues</div>
                  {parsed.issues.map((iss, idx) => (
                    <div
                      key={`${iss.field}-${idx}`}
                      className={cx("rounded-lg border px-3 py-2 text-sm flex items-start gap-2", badgeForSeverity(iss.severity))}
                    >
                      <IconForSeverity sev={iss.severity} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{iss.severity.toUpperCase()}</span>
                          <span className="text-xs opacity-80">Field:</span>
                          <span className="text-xs font-mono opacity-90">{iss.field || "—"}</span>
                          <span className="text-xs opacity-80">Section:</span>
                          <span className="text-xs opacity-90">{iss.section || "—"}</span>
                        </div>
                        <div className="mt-0.5">{iss.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Field grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldCard
                  label="Property Address"
                  value={parsed.fields.propertyAddress ?? ""}
                  editable
                  onEdit={() => setEditingKey("propertyAddress")}
                  isEditing={editingKey === "propertyAddress"}
                  inputType="text"
                  placeholder="123 Main St, City, TN ZIP"
                  onChange={(v) => updateField("propertyAddress", v)}
                  onBlur={() => setEditingKey(null)}
                />

                <FieldCard
                  label="Contract Type (buyer/seller/unknown)"
                  value={parsed.fields.contractType ?? "unknown"}
                  editable
                  onEdit={() => setEditingKey("contractType")}
                  isEditing={editingKey === "contractType"}
                  inputType="text"
                  placeholder="buyer"
                  onChange={(v) => updateField("contractType", v)}
                  onBlur={() => setEditingKey(null)}
                />

                <FieldCard
                  label="Buyer Names (comma-separated)"
                  value={(parsed.fields.buyerNames || []).join(", ")}
                  editable
                  onEdit={() => setEditingKey("buyerNames")}
                  isEditing={editingKey === "buyerNames"}
                  inputType="text"
                  placeholder="John Smith, Jane Smith"
                  onChange={(v) => updateField("buyerNames", v)}
                  onBlur={() => setEditingKey(null)}
                />

                <FieldCard
                  label="Seller Names (comma-separated)"
                  value={(parsed.fields.sellerNames || []).join(", ")}
                  editable
                  onEdit={() => setEditingKey("sellerNames")}
                  isEditing={editingKey === "sellerNames"}
                  inputType="text"
                  placeholder="Bob Johnson"
                  onChange={(v) => updateField("sellerNames", v)}
                  onBlur={() => setEditingKey(null)}
                />

                <FieldCard
                  label="Purchase Price"
                  value={formatMoney(parsed.fields.purchasePrice)}
                  editable
                  onEdit={() => setEditingKey("purchasePrice")}
                  isEditing={editingKey === "purchasePrice"}
                  inputType="number"
                  placeholder="425000"
                  onChange={(v) => updateField("purchasePrice", v)}
                  onBlur={() => setEditingKey(null)}
                />

                <FieldCard
                  label="Earnest Money"
                  value={formatMoney(parsed.fields.earnestMoney)}
                  editable
                  onEdit={() => setEditingKey("earnestMoney")}
                  isEditing={editingKey === "earnestMoney"}
                  inputType="number"
                  placeholder="5000"
                  onChange={(v) => updateField("earnestMoney", v)}
                  onBlur={() => setEditingKey(null)}
                />

                <FieldCard
                  label="Binding Date"
                  value={parsed.fields.bindingDate ?? ""}
                  editable
                  onEdit={() => setEditingKey("bindingDate")}
                  isEditing={editingKey === "bindingDate"}
                  inputType="date"
                  onChange={(v) => updateField("bindingDate", v)}
                  onBlur={() => setEditingKey(null)}
                />

                <FieldCard
                  label="Closing Date"
                  value={parsed.fields.closingDate ?? ""}
                  editable
                  onEdit={() => setEditingKey("closingDate")}
                  isEditing={editingKey === "closingDate"}
                  inputType="date"
                  onChange={(v) => updateField("closingDate", v)}
                  onBlur={() => setEditingKey(null)}
                />

                <FieldCard
                  label="Inspection End Date"
                  value={parsed.fields.inspectionEndDate ?? ""}
                  editable
                  onEdit={() => setEditingKey("inspectionEndDate")}
                  isEditing={editingKey === "inspectionEndDate"}
                  inputType="date"
                  onChange={(v) => updateField("inspectionEndDate", v)}
                  onBlur={() => setEditingKey(null)}
                />

                <FieldCard
                  label="Financing Contingency Date"
                  value={parsed.fields.financingContingencyDate ?? ""}
                  editable
                  onEdit={() => setEditingKey("financingContingencyDate")}
                  isEditing={editingKey === "financingContingencyDate"}
                  inputType="date"
                  onChange={(v) => updateField("financingContingencyDate", v)}
                  onBlur={() => setEditingKey(null)}
                />
              </div>

              <div className="mt-3 bg-[#0f3460] border border-white/10 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-300">Special Stipulations</div>
                  <button
                    type="button"
                    onClick={() => setEditingKey("specialStipulations")}
                    className="text-gray-300 hover:text-orange-100 transition"
                    aria-label="Edit Special Stipulations"
                    title="Edit Special Stipulations"
                  >
                    <Pencil size={14} />
                  </button>
                </div>

                <div className="mt-2">
                  {editingKey === "specialStipulations" ? (
                    <textarea
                      value={parsed.fields.specialStipulations ?? ""}
                      onChange={(e) => updateField("specialStipulations", e.target.value)}
                      onBlur={() => setEditingKey(null)}
                      rows={6}
                      className="w-full rounded-lg bg-[#1a1a2e] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10"
                      placeholder="Paste or edit stipulations…"
                    />
                  ) : (
                    <div className="text-sm text-white whitespace-pre-line">
                      {parsed.fields.specialStipulations ? parsed.fields.specialStipulations : <span className="text-gray-500">—</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg bg-[#0f3460] border border-white/10 px-4 py-2 text-sm text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-lg bg-orange-500 text-black px-5 py-2 text-sm font-semibold hover:opacity-95 transition"
                >
                  Continue to Timeline
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* STEP 3: Timeline */}
        {step === 3 && parsed && (
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-sm font-semibold">Timeline</div>
                  <div className="text-xs text-gray-400">Edit labels/dates. Add or remove events as needed.</div>
                </div>
                <button
                  type="button"
                  onClick={addTimelineEvent}
                  className="rounded-lg bg-[#0f3460] border border-white/10 px-3 py-2 text-sm text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                >
                  + Add Event
                </button>
              </div>

              <div className="space-y-3">
                {(parsed.timeline || []).map((ev, idx) => (
                  <div key={`${ev.label}-${idx}`} className="bg-[#0f3460] border border-white/10 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px] gap-3 w-full">
                        <div>
                          <div className="text-xs text-gray-300">Label</div>
                          <input
                            value={ev.label}
                            onChange={(e) => updateTimeline(idx, { label: e.target.value })}
                            className="mt-1 w-full rounded-lg bg-[#1a1a2e] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10"
                          />
                        </div>

                        <div>
                          <div className="text-xs text-gray-300">Date</div>
                          <input
                            type="date"
                            value={ev.date ?? ""}
                            onChange={(e) => updateTimeline(idx, { date: e.target.value || null })}
                            className="mt-1 w-full rounded-lg bg-[#1a1a2e] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10"
                          />
                        </div>

                        <div>
                          <div className="text-xs text-gray-300">Status</div>
                          <select
                            value={ev.status}
                            onChange={(e) => updateTimeline(idx, { status: e.target.value === "complete" ? "complete" : "pending" })}
                            className="mt-1 w-full rounded-lg bg-[#1a1a2e] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10"
                          >
                            <option value="pending">pending</option>
                            <option value="complete">complete</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeTimelineEvent(idx)}
                        className="rounded-lg bg-[#1a1a2e] border border-white/10 px-3 py-2 text-sm text-gray-200 hover:border-red-500/30 hover:text-red-100 transition"
                        aria-label="Remove event"
                        title="Remove event"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {(parsed.timeline || []).length === 0 && (
                  <div className="text-sm text-gray-300 bg-[#16213e] border border-white/10 rounded-lg p-4">
                    No timeline events returned. Add events above or go back and check your extracted dates.
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg bg-[#0f3460] border border-white/10 px-4 py-2 text-sm text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="rounded-lg bg-orange-500 text-black px-5 py-2 text-sm font-semibold hover:opacity-95 transition"
                >
                  Continue to Confirm
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* STEP 4: Confirm */}
        {step === 4 && parsed && (
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Confirm Transaction</div>
                  <div className="text-xs text-gray-400">
                    This will create the transaction using the fields + issues + timeline shown here.
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="bg-[#0f3460] border border-white/10 rounded-lg p-3">
                  <div className="text-xs text-gray-300">Property Address</div>
                  <div className="mt-1 text-sm text-white">{parsed.fields.propertyAddress || <span className="text-gray-500">—</span>}</div>
                </div>

                <div className="bg-[#0f3460] border border-white/10 rounded-lg p-3">
                  <div className="text-xs text-gray-300">Contract Type</div>
                  <div className="mt-1 text-sm text-white">{parsed.fields.contractType}</div>
                </div>

                <div className="bg-[#0f3460] border border-white/10 rounded-lg p-3">
                  <div className="text-xs text-gray-300">Buyers</div>
                  <div className="mt-1 text-sm text-white">
                    {(parsed.fields.buyerNames || []).length ? parsed.fields.buyerNames.join(", ") : <span className="text-gray-500">—</span>}
                  </div>
                </div>

                <div className="bg-[#0f3460] border border-white/10 rounded-lg p-3">
                  <div className="text-xs text-gray-300">Sellers</div>
                  <div className="mt-1 text-sm text-white">
                    {(parsed.fields.sellerNames || []).length ? parsed.fields.sellerNames.join(", ") : <span className="text-gray-500">—</span>}
                  </div>
                </div>

                <div className="bg-[#0f3460] border border-white/10 rounded-lg p-3">
                  <div className="text-xs text-gray-300">Purchase Price</div>
                  <div className="mt-1 text-sm text-white">{parsed.fields.purchasePrice ?? <span className="text-gray-500">—</span>}</div>
                </div>

                <div className="bg-[#0f3460] border border-white/10 rounded-lg p-3">
                  <div className="text-xs text-gray-300">Earnest Money</div>
                  <div className="mt-1 text-sm text-white">{parsed.fields.earnestMoney ?? <span className="text-gray-500">—</span>}</div>
                </div>

                <div className="bg-[#0f3460] border border-white/10 rounded-lg p-3">
                  <div className="text-xs text-gray-300">Binding Date</div>
                  <div className="mt-1 text-sm text-white">{parsed.fields.bindingDate ?? <span className="text-gray-500">—</span>}</div>
                </div>

                <div className="bg-[#0f3460] border border-white/10 rounded-lg p-3">
                  <div className="text-xs text-gray-300">Closing Date</div>
                  <div className="mt-1 text-sm text-white">{parsed.fields.closingDate ?? <span className="text-gray-500">—</span>}</div>
                </div>
              </div>

              {(parsed.issues?.length || 0) > 0 && (
                <div className="mt-4 bg-[#16213e] border border-white/10 rounded-lg p-4">
                  <div className="text-xs font-semibold tracking-wide text-gray-200 uppercase">Issues Summary</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={cx("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs", badgeForSeverity("error"))}>
                      <IconForSeverity sev="error" /> Errors: {issuesBySeverity.error.length}
                    </span>
                    <span className={cx("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs", badgeForSeverity("warning"))}>
                      <IconForSeverity sev="warning" /> Warnings: {issuesBySeverity.warning.length}
                    </span>
                    <span className={cx("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs", badgeForSeverity("info"))}>
                      <IconForSeverity sev="info" /> Info: {issuesBySeverity.info.length}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-lg bg-[#0f3460] border border-white/10 px-4 py-2 text-sm text-gray-200 hover:border-orange-500/30 hover:text-orange-100 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // persist was stored earlier; call parent and clear pending parsed
                    try{ localStorage.removeItem('pending_parsed_deal') }catch(e){}
                    onConfirm(parsed);
                    resetAll();
                  }}
                  className="rounded-lg bg-orange-500 text-black px-6 py-2 text-sm font-semibold hover:opacity-95 transition"
                >
                  Save / Create Transaction
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
