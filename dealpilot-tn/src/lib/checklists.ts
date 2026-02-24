import { supabaseAdmin } from './supabase';
import { clampLimit, clampPage, getRangeBounds } from './pagination';

type ChecklistRow = {
  id: string;
  created_at: string;
  deal_id: string | null;
  title: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
};

export type ChecklistRecord = {
  id: string;
  created_at: string;
  deal_id: string | null;
  title: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
};

export type CreateChecklistInput = {
  deal_id?: string | null;
  title?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type UpdateChecklistInput = Partial<CreateChecklistInput>;

export type ListChecklistsOptions = {
  limit?: number;
  page?: number;
  deal_id?: string;
  status?: string;
};

export type ListChecklistsResult = {
  data: ChecklistRecord[];
  count: number | null;
  limit: number;
  page: number;
};

const TABLE_NAME = 'checklists';

const normalizeChecklist = (row: ChecklistRow | null): ChecklistRecord | null => {
  if (!row) return null;
  return {
    id: row.id,
    created_at: row.created_at,
    deal_id: row.deal_id,
    title: row.title,
    status: row.status,
    metadata: row.metadata ?? null
  };
};

const applyFilters = (query: any, options: ListChecklistsOptions) => {
  if (options.deal_id !== undefined && options.deal_id !== null && options.deal_id !== '') {
    query.eq('deal_id', options.deal_id);
  }
  if (options.status !== undefined && options.status !== null && options.status !== '') {
    query.eq('status', options.status);
  }
};

export const createChecklist = async (payload: CreateChecklistInput): Promise<ChecklistRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).insert(payload).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeChecklist(data as ChecklistRow | null);
  if (!record) {
    throw new Error('Failed to create checklist.');
  }
  return record;
};

export const getChecklist = async (id: string): Promise<ChecklistRecord | null> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).select('*').eq('id', id).maybeSingle();
  if (error) {
    throw error;
  }
  return normalizeChecklist(data as ChecklistRow | null);
};

export const updateChecklist = async (id: string, updates: UpdateChecklistInput): Promise<ChecklistRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).update(updates).eq('id', id).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeChecklist(data as ChecklistRow | null);
  if (!record) {
    throw new Error('Checklist not found.');
  }
  return record;
};

export const deleteChecklist = async (id: string): Promise<ChecklistRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).delete().eq('id', id).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeChecklist(data as ChecklistRow | null);
  if (!record) {
    throw new Error('Checklist not found.');
  }
  return record;
};

export const listChecklists = async (options: ListChecklistsOptions = {}): Promise<ListChecklistsResult> => {
  const limit = clampLimit(options.limit);
  const page = clampPage(options.page);
  const { start, end } = getRangeBounds(limit, page);
  const query = supabaseAdmin.from(TABLE_NAME).select('*', { count: 'exact' });
  applyFilters(query, options);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, end);
  if (error) {
    throw error;
  }
  const rows = (Array.isArray(data) ? data : []) as ChecklistRow[];
  return {
    data: rows.map(row => normalizeChecklist(row)).filter((row): row is ChecklistRecord => row !== null),
    count: typeof count === 'number' ? count : null,
    limit,
    page
  };
};
