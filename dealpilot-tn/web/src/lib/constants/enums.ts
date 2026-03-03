export const DEAL_STATUSES = [
  "active",
  "under_contract",
  "pending",
  "closed",
  "cancelled",
] as const;

export type DealStatus = (typeof DEAL_STATUSES)[number];

export const DEAL_TYPES = ["buyer", "seller", "dual", "referral"] as const;

export type DealType = (typeof DEAL_TYPES)[number];

export const STATUS_LABELS: Record<DealStatus, string> = {
  active: "Active",
  under_contract: "Under Contract",
  pending: "Pending",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const TYPE_LABELS: Record<DealType, string> = {
  buyer: "Buyer",
  seller: "Seller",
  dual: "Dual",
  referral: "Referral",
};

export type HealthLevel = "healthy" | "attention" | "at_risk" | "unknown";

export const HEALTH_LABELS: Record<HealthLevel, string> = {
  healthy: "Healthy",
  attention: "Attention",
  at_risk: "At Risk",
  unknown: "Unknown",
};

export const BADGE_CLASSES = {
  // Status badges
  status: {
    active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    under_contract: "border-orange-500/30 bg-orange-500/10 text-orange-200",
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    closed: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    cancelled: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  } satisfies Record<DealStatus, string>,

  // Type badges
  type: {
    buyer: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    seller: "border-violet-500/30 bg-violet-500/10 text-violet-200",
    dual: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
    referral: "border-teal-500/30 bg-teal-500/10 text-teal-200",
  } satisfies Record<DealType, string>,

  // Health badges
  health: {
    healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    attention: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    at_risk: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    unknown: "border-gray-500/30 bg-gray-500/10 text-gray-300",
  } satisfies Record<HealthLevel, string>,
} as const;

export function parseDealStatus(value: string | null | undefined): DealStatus | null {
  if (!value) return null;
  return (DEAL_STATUSES as readonly string[]).includes(value) ? (value as DealStatus) : null;
}

export function parseDealType(value: string | null | undefined): DealType | null {
  if (!value) return null;
  return (DEAL_TYPES as readonly string[]).includes(value) ? (value as DealType) : null;
}

export function daysUntil(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  const now = new Date();
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getHealthFromClosing(closing: string | null | undefined): { level: HealthLevel; days: number | null } {
  const d = daysUntil(closing);
  if (d === null) return { level: "unknown", days: null };
  if (d < 0) return { level: "at_risk", days: d };
  if (d <= 7) return { level: "at_risk", days: d };
  if (d <= 21) return { level: "attention", days: d };
  return { level: "healthy", days: d };
}
