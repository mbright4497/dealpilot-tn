"use client";

import * as React from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import type { Transaction } from "@/lib/types/transaction";
import type { DealStatus } from "@/lib/constants/enums";

type UseTransactionsOptions = {
  status?: DealStatus | "all";
};

type UseTransactionsResult = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useTransactions(options: UseTransactionsOptions = {}): UseTransactionsResult {
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const status = options.status ?? "all";

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("transactions")
        .select("id,address,client,type,status,binding,closing,notes,contacts,created_at,updated_at")
        .order("created_at", { ascending: false });

      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error: qErr } = await query;

      if (qErr) {
        console.error("useTransactions query error:", qErr);
        setError(qErr.message || "Failed to load transactions");
        setTransactions([]);
        return;
      }

      setTransactions((data as Transaction[]) ?? []);
    } catch (e: any) {
      console.error("useTransactions error:", e);
      setError(e?.message || "Failed to load transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, status]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { transactions, loading, error, refresh };
}
