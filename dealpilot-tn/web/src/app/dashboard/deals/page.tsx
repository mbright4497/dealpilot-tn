'use client'
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransactions } from "@/lib/hooks/useTransactions";
import {
  const router = useRouter()
  BADGE_CLASSES,
  DEAL_STATUSES,
  HEALTH_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  getHealthFromClosing,
  parseDealStatus,
  parseDealType,
  type DealStatus,
} from "@/lib/constants/enums";
import type { Transaction } from "@/lib/types/transaction";

type FilterValue = "all" | DealStatus;

function Badge({
  className,
  children,
  title,
}: {
  className: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        className,
      ].join(" ")}
      title={title}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

export default function DealsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState<FilterValue>("all");
  const { transactions, loading, error, refresh } = useTransactions({
    status: statusFilter,
  });

  const onRowClick = (id: string) => {
    router.push(`/dashboard/deals/${id}`);
  };

  const rows: Transaction[] = transactions;

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-gray-300">ClosingPilot TN</p>
            <h1 className="text-2xl font-semibold">Transactions</h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-300">
              Status
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as FilterValue)
                }
                className="ml-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 outline-none hover:bg-white/10"
              >
                <option value="all">All</option>
                {DEAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 hover:bg-white/10"
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-6">
          {loading && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-gray-300">
              Loading transactions…
            </div>
          )}
          {!loading && error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-rose-100">
              <p className="font-medium">Couldn't load transactions</p>
              <p className="mt-1 text-sm text-rose-100/80">{error}</p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="mt-4 rounded-xl border border-rose-200/20 bg-rose-200/10 px-3 py-2 text-sm hover:bg-rose-200/15"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
              <h2 className="text-lg font-medium">No transactions found</h2>
              <p className="mt-2 text-sm text-gray-300">
                Try switching the status filter or create your first deal.
              </p>
            </div>
          )}
          {!loading && !error && rows.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#16213e]">
              <table className="w-full border-collapse">
                <thead className="bg-white/5 text-sm text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left">Address</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Binding</th>
                    <th className="px-4 py-3 text-left">Closing</th>
                    <th className="px-4 py-3 text-left">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((deal) => {
                    const status = parseDealStatus(deal.status) ?? null;
                    const type = parseDealType(deal.type) ?? null;
                    const { level = 'unknown', days } = getHealthFromClosing(deal.closing) as any;
                    return (
                      <tr
                        key={deal.id}
                        onClick={() => onRowClick(deal.id)}
                        className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                        role="link"
                        tabIndex={0}
                        aria-label={`Open deal ${deal.address}`}
                        data-deal-id={deal.id}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            onRowClick(deal.id);
                        }}
                      >
                        <td className="px-4 py-3 font-medium max-w-[300px] truncate" title={deal.address}>{deal.address}</td>
                        <td className="px-4 py-3 text-gray-200">
                          {deal.client || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {type ? (
                            <Badge className={BADGE_CLASSES.type[type]}>
                              {TYPE_LABELS[type]}
                            </Badge>
                          ) : (
                            <span className="text-gray-300">
                              {deal.type || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {status ? (
                            <Badge className={BADGE_CLASSES.status[status]}>
                              {STATUS_LABELS[status]}
                            </Badge>
                          ) : (
                            <span className="text-gray-300">
                              {deal.status || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-200">
                          {formatDate(deal.binding)}
                        </td>
                        <td className="px-4 py-3 text-gray-200">
                          {formatDate(deal.closing)}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const healthClass = level === 'unknown' ? BADGE_CLASSES.health.unknown : (BADGE_CLASSES.health[level] || BADGE_CLASSES.health.unknown)
                            return (
                              <Badge className={healthClass} title={days === null ? undefined : `${days} day(s) until closing`}>
                                {HEALTH_LABELS[level]}
                                {days === null ? "" : ` · ${days}d`}
                              </Badge>
                            )
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}