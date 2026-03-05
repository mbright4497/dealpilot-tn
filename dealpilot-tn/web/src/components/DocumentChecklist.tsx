// src/components/DocumentChecklist.tsx
"use client";

import React, { useMemo, useState } from "react";
import type {
  ConditionKey,
  DocumentDefinition,
  DocumentKey,
  DocumentStatus,
  RequirementRule,
  TransactionChecklistContext,
  TransactionPhaseKey,
} from "@/lib/transaction-phases";
import {
  getTransactionConfig,
  isDocApplicable,
  requirementLabel,
} from "@/lib/transaction-phases";

type DocUIStatus = DocumentStatus;

export type DocumentRecord = {
  key: DocumentKey;
  status: DocUIStatus;
  fileName?: string;
  uploadedAt?: string; // ISO
  path?: string;
};

export type DocumentChecklistProps = {
  /**
   * Drives which state/side config to load.
   * Example: { state: "TN", side: "buyer", conditions: {...} }
   */
  context: TransactionChecklistContext;

  /**
   * Current uploaded docs for this transaction (from DB).
   * Map by document key.
   */
  documentsByKey: Record<DocumentKey, DocumentRecord | undefined>;

  /**
   * Called when user clicks Upload on a doc.
   * You can open a modal, trigger a hidden input, route to upload screen, etc.
   * Component stays layout-safe (no dashboard changes).
   */
  onUpload: (doc: DocumentDefinition) => void;

  /** Optional: open the uploaded file in a new tab */
  onView?: (path: string) => void;

  /** Optional: trigger a download of the uploaded file */
  onDownload?: (path: string) => void;

  /**
   * Optional: when user wants to mark something as "Signed" after upload.
   * If not provided, the Signed button won’t show.
   */
  onMarkSigned?: (docKey: DocumentKey) => void;

  /**
   * Optional title override
   */
  title?: string;

  /**
   * Optional: show only a subset of phases (default shows all)
   */
  visiblePhases?: TransactionPhaseKey[];
};

function StatusPill({ status }: { status: DocUIStatus }) {
  const styles =
    status === "signed"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : status === "uploaded"
      ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
      : "bg-gray-500/15 text-gray-300 border-gray-500/30";

  const label =
    status === "signed" ? "Signed" : status === "uploaded" ? "Uploaded" : "Not uploaded";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${styles}`}>
      {label}
    </span>
  );
}

function RequirementPill({ rule }: { rule: RequirementRule }) {
  const label = requirementLabel(rule);

  const styles =
    label === "Required"
      ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
      : label === "Conditional"
      ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
      : "bg-gray-500/15 text-gray-300 border-gray-500/30";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${styles}`}>
      {label}
    </span>
  );
}

function PhaseHeader({
  title,
  subtitle,
  isOpen,
  onToggle,
  progressLabel,
}: {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  progressLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-left rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 hover:border-gray-700 transition"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-800 bg-gray-950 text-orange-400"
              aria-hidden="true"
            >
              {isOpen ? "−" : "+"}
            </span>
            <h3 className="text-base font-semibold text-white truncate">{title}</h3>
          </div>
          {subtitle ? <p className="mt-1 text-sm text-gray-400">{subtitle}</p> : null}
        </div>

        <div className="shrink-0 text-sm text-gray-300">
          <span className="text-orange-400 font-semibold">{progressLabel}</span>
        </div>
      </div>
    </button>
  );
}

function computeCompletionCount(
  docs: DocumentDefinition[],
  docsByKey: Record<DocumentKey, DocumentRecord | undefined>,
  conditions: Partial<Record<ConditionKey, boolean>> | undefined
) {
  // Only count docs that are applicable (required/optional/conditional satisfied)
  const applicable = docs.filter((d) => isDocApplicable(d, conditions));

  const total = applicable.length;

  let done = 0;
  for (const d of applicable) {
    const rec = docsByKey[d.key];
    if (rec?.status === "uploaded" || rec?.status === "signed") done++;
  }

  return { done, total, applicable };
}

export default function DocumentChecklist({
  context,
  documentsByKey,
  onUpload,
  onView,
  onDownload,
  onMarkSigned,
  title = "Document Checklist",
  visiblePhases,
}: DocumentChecklistProps) {
  const config = useMemo(() => getTransactionConfig(context), [context]);
  const phases = useMemo(() => {
    const all = config.phases;
    if (!visiblePhases || visiblePhases.length === 0) return all;
    const set = new Set(visiblePhases);
    return all.filter((p) => set.has(p.key));
  }, [config.phases, visiblePhases]);

  // Open the first phase by default, keep others collapsed.
  const [openPhase, setOpenPhase] = useState<TransactionPhaseKey>(phases[0]?.key ?? "consultation");

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white truncate">{title}</h2>
          <p className="mt-1 text-sm text-gray-400">
            {context.state} • {context.side === "buyer" ? "Buyer Side" : "Seller Side"}
          </p>
        </div>
        <div className="shrink-0">
          <span className="inline-flex items-center rounded-full border border-gray-800 bg-gray-950 px-3 py-1 text-xs text-gray-300">
            Orange = Required
            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#F97316]" />
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {phases.map((phase) => {
          const { done, total, applicable } = computeCompletionCount(
            phase.documents.slice().sort((a, b) => a.order - b.order),
            documentsByKey,
            context.conditions
          );

          const isOpen = openPhase === phase.key;
          const progressLabel = `${done} of ${total} documents uploaded`;

          return (
            <div key={phase.key} className="space-y-2">
              <PhaseHeader
                title={phase.title}
                subtitle={phase.description}
                isOpen={isOpen}
                onToggle={() => setOpenPhase((prev) => (prev === phase.key ? prev : phase.key))}
                progressLabel={progressLabel}
              />

              {isOpen ? (
                <div className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-2">
                  {applicable.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-400">
                      No documents configured for this phase yet.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-800">
                      {applicable.map((doc) => {
                        const rec = documentsByKey[doc.key];
                        const status: DocUIStatus = rec?.status ?? "not_uploaded";
                        const fileLabel = rec?.fileName ? rec.fileName : null;
                        const uploadedAt = rec?.uploadedAt ? new Date(rec.uploadedAt).toLocaleString() : null;
                        const storagePath = (rec as any)?.path || null;

                        return (
                          <li key={doc.key} className="py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold text-white">{doc.title}</h4>
                                  <RequirementPill rule={doc.requirement} />
                                  <StatusPill status={status} />
                                </div>

                                {doc.description ? (
                                  <p className="mt-1 text-sm text-gray-400">{doc.description}</p>
                                ) : null}

                                {fileLabel ? (
                                  <div className="mt-1 text-xs text-gray-400">
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                                      <div className="truncate">
                                        <div className="text-gray-200">{fileLabel}</div>
                                        {uploadedAt && <div className="text-gray-500 text-xs">{uploadedAt}</div>}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-1 text-xs text-gray-500 break-all">
                                    <span className="text-gray-500">Key:</span> {doc.key}
                                  </p>
                                )}
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {fileLabel && (onView || onDownload) ? (
                                  <>
                                    {onView ? (
                                      <button type="button" onClick={() => storagePath && onView(storagePath)} className="rounded-lg border px-3 py-2 text-xs font-semibold bg-gray-900 text-gray-200 hover:border-gray-700">View</button>
                                    ) : null}
                                    {onDownload ? (
                                      <button type="button" onClick={() => storagePath && onDownload(storagePath)} className="rounded-lg border px-3 py-2 text-xs font-semibold bg-gray-900 text-gray-200 hover:border-gray-700">Download</button>
                                    ) : null}
                                  </>
                                ) : null}

                                {status !== "signed" && onMarkSigned ? (
                                  <button
                                    type="button"
                                    onClick={() => onMarkSigned(doc.key)}
                                    disabled={status === "not_uploaded"}
                                    className={[
                                      "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                                      status === "not_uploaded"
                                        ? "border-gray-800 bg-gray-900 text-gray-600 cursor-not-allowed"
                                        : "border-gray-800 bg-gray-900 text-gray-200 hover:border-gray-700",
                                    ].join(" ")}
                                  >
                                    Mark Signed
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => onUpload(doc)}
                                  className="rounded-lg bg-[#F97316] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
                                >
                                  {fileLabel ? 'Replace' : 'Upload'}
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
