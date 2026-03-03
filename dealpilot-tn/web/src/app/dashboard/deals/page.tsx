"use client";

import * as React from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Transaction = {
  id: string;
  address: string;
  client: string | null;
  type: string | null;
  status: string | null;
  binding: string | null;
  closing: string | null;
};

function daysUntil(date: string | null) {
  if (!date) return null;
  const now = new Date();
  const target = new Date(date);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function healthFromClosing(closing: string | null) {
  const days = daysUntil(closing);
  if (days === null) return { label: "Unknown", className: "bg-gray-500/15 text-gray-300" };
  if (days < 0) return { label: "Overdue", className: "bg-rose-500/15 text-rose-300" };
  if (days <= 7) return { label: "At Risk", className: "bg-amber-500/15 text-amber-300" };
  return { label: "Healthy", className: "bg-emerald-500/15 text-emerald-300" };
}

export default function DealsPage() {
  const supabase = createClientComponentClient();
  const [deals, setDeals] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("id, address, client, type, status, binding, closing")
        .order("created_at", { ascending: false });
      if (!error && data) setDeals(data as Transaction[]);
      setLoading(false);
    };
    void load();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm text-gray-400">All active and historical deals in your pipeline</p>
        </div>

        {/* Empty State */}
        {!loading && deals.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-gray-900 p-8 text-center">
            <p className="text-lg font-medium">No transactions yet</p>
            <p className="mt-2 text-sm text-gray-400">Once you start a deal, it will appear here.</p>
          </div>
        )}

        {/* Table */}
        {!loading && deals.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-gray-900">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-900/80 text-left text-gray-300">
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Binding</th>
                  <th className="px-4 py-3">Closing</th>
                  <th className="px-4 py-3">Health</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const health = healthFromClosing(deal.closing);
                  return (
                    <tr key={deal.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 font-medium">{deal.address || "\u2014"}</td>
                      <td className="px-4 py-3 text-gray-300">{deal.client || "\u2014"}</td>
                      <td className="px-4 py-3 text-gray-300">{deal.type || "\u2014"}</td>
                      <td className="px-4 py-3 text-gray-300">{deal.status || "\u2014"}</td>
                      <td className="px-4 py-3 text-gray-300">{deal.binding ? new Date(deal.binding).toLocaleDateString() : "\u2014"}</td>
                      <td className="px-4 py-3 text-gray-300">{deal.closing ? new Date(deal.closing).toLocaleDateString() : "\u2014"}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${health.className}`}>{health.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {loading && (
          <p className="text-sm text-gray-400">Loading transactions\u2026</p>
        )}
      </div>
    </div>
  );
}
