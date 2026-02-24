import { supabaseAdmin } from './supabase';

type DealRow = {
  id: string;
  title: string;
  buyer_contact: string | null;
  seller_contact: string | null;
  status: string | null;
  value: string | number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type DealRecord = {
  id: string;
  title: string;
  buyer_contact: string | null;
  seller_contact: string | null;
  status: string | null;
  value: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type CreateDealInput = {
  title: string;
  buyer_contact?: string | null;
  seller_contact?: string | null;
  status?: string | null;
  value?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type UpdateDealInput = Partial<CreateDealInput>;

export type ListDealsOptions = {
  limit?: number;
  page?: number;
  status?: string | null;
  buyer_contact?: string | null;
  seller_contact?: string | null;
};

export type ListDealsResult = {
  data: DealRecord[];
  count: number | null;
  limit: number;
  page: number;
};

const TABLE_NAME = 'deals';

const normalizeDeal = (row: DealRow | null): DealRecord | null => {
  if (!row) return null;
  const parsedValue =
    typeof row.value === 'string'
      ? Number(row.value)
      : typeof row.value === 'number'
      ? row.value
      : null;
  return {
    id: row.id,
    title: row.title,
    buyer_contact: row.buyer_contact,
    seller_contact: row.seller_contact,
    status: row.status,
    value: Number.isNaN(parsedValue) ? null : parsedValue,
    metadata: row.metadata ?? null,
    created_at: row.created_at
  } as DealRecord;
};

export const createDeal = async (payload: CreateDealInput): Promise<DealRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).insert(payload).select('*').single();
  if (error) {
    throw error;
  }
  const deal = normalizeDeal(data as DealRow | null);
  if (!deal) {
    throw new Error('Failed to create deal.');
  }
  return deal;
};

export const getDeal = async (id: string): Promise<DealRecord | null> => {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return normalizeDeal(data as DealRow | null);
};

export const updateDeal = async (id: string, updates: UpdateDealInput): Promise<DealRecord> => {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  const updated = normalizeDeal(data as DealRow | null);
  if (!updated) {
    throw new Error('Deal not found.');
  }
  return updated;
};

export const deleteDeal = async (id: string): Promise<DealRecord> => {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .delete()
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  const deleted = normalizeDeal(data as DealRow | null);
  if (!deleted) {
    throw new Error('Deal not found.');
  }
  return deleted;
};

const clampLimit = (value?: number) => {
  if (!value || Number.isNaN(value)) return 20;
  return Math.min(Math.max(value, 1), 100);
};

const clampPage = (value?: number) => {
  if (!value || Number.isNaN(value)) return 1;
  return Math.max(Math.floor(value), 1);
};

const applyFilters = (query: any, options: ListDealsOptions) => {
  if (options.status !== undefined && options.status !== null && options.status !== '') {
    query.eq('status', options.status);
  }
  if (options.buyer_contact !== undefined && options.buyer_contact !== null && options.buyer_contact !== '') {
    query.eq('buyer_contact', options.buyer_contact);
  }
  if (options.seller_contact !== undefined && options.seller_contact !== null && options.seller_contact !== '') {
    query.eq('seller_contact', options.seller_contact);
  }
};

export const listDeals = async (options: ListDealsOptions = {}): Promise<ListDealsResult> => {
  const limit = clampLimit(options.limit);
  const page = clampPage(options.page);
  const start = (page - 1) * limit;
  const end = start + limit - 1;
  const query = supabaseAdmin.from(TABLE_NAME).select('*', { count: 'exact' });
  applyFilters(query, options);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, end);
  if (error) {
    throw error;
  }
  const rows = (Array.isArray(data) ? data : []) as DealRow[];
  return {
    data: rows.map(row => normalizeDeal(row)).filter((row): row is DealRecord => row !== null),
    count: typeof count === 'number' ? count : null,
    limit,
    page
  };
};
