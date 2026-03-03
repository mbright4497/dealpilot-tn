import type { DealStatus, DealType } from "@/lib/constants/enums";

export type Transaction = {
  id: string;
  address: string;
  client: string | null;
  type: DealType | string | null; // tolerate legacy / free-text values
  status: DealStatus | string | null; // tolerate legacy / free-text values
  binding: string | null; // ISO string or date-ish
  closing: string | null; // ISO string or date-ish
  notes: string | null;
  contacts: unknown | null; // keep flexible (json/text) until finalized
  created_at: string | null;
  updated_at: string | null;
};

export type TransactionUpdate = Partial<Pick<Transaction, "address" | "client" | "type" | "status" | "binding" | "closing" | "notes" | "contacts">>;
