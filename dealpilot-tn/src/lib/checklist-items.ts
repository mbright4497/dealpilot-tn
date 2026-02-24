import { supabaseAdmin } from './supabase';
import { clampLimit, clampPage, getRangeBounds } from './pagination';

type ChecklistItemRow = {
  id: string;
  created_at: string;
  checklist_id: string | null;
  title: string | null;
  description: string | null;
  owner: string | null;
  due_date: string | null;
  completed: boolean;
  metadata: Record<string, unknown> | null;
};

export type ChecklistItemRecord = {
  id: string;
  created_at: string;
  checklist_id: string | null;
  title: string | null;
  description: string | null;
  owner: string | null;
  due_date: string | null;
  completed: boolean;
  metadata: Record<string, unknown> | null;
};

export type CreateChecklistItemInput = {
  checklist_id?: string | null;
  title?: string | null;
  description?: string | null;
  owner?: string | null;
  due_date?: string | null;
  completed?: boolean;
  metadata?: Record<string, unknown> | null;
};

export type UpdateChecklistItemInput = Partial<CreateChecklistItemInput>;

export type ListChecklistItemsOptions = {
  limit?: number;
  page?: number;
  checklist_id?: string;
  owner?: string;
  completed?: boolean;
};

export type ListChecklistItemsResult = {
  data: ChecklistItemRecord[];
  count: number | null;
  limit: number;
  page: number;
};

const TABLE_NAME = 'checklist_items';

const normalizeChecklistItem = (row: ChecklistItemRow | null): ChecklistItemRecord | null => {
  if (!row) return null;
  return {
    id: row.id,
    created_at: row.created_at,
    checklist_id: row.checklist_id,
    title: row.title,
    description: row.description,
    owner: row.owner,
    due_date: row.due_date,
    completed: Boolean(row.completed),
    metadata: row.metadata ?? null
  };
};

const applyFilters = (query: any, options: ListChecklistItemsOptions) => {
  if (options.checklist_id !== undefined && options.checklist_id !== null && options.checklist_id !== '') {
    query.eq('checklist_id', options.checklist_id);
  }
  if (options.owner !== undefined && options.owner !== null && options.owner !== '') {
    query.eq('owner', options.owner);
  }
  if (options.completed !== undefined && options.completed !== null) {
    query.eq('completed', options.completed);
  }
};

export const createChecklistItem = async (payload: CreateChecklistItemInput): Promise<ChecklistItemRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).insert(payload).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeChecklistItem(data as ChecklistItemRow | null);
  if (!record) {
    throw new Error('Failed to create checklist item.');
  }
  return record;
};

export const getChecklistItem = async (id: string): Promise<ChecklistItemRecord | null> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).select('*').eq('id', id).maybeSingle();
  if (error) {
    throw error;
  }
  return normalizeChecklistItem(data as ChecklistItemRow | null);
};

export const updateChecklistItem = async (id: string, updates: UpdateChecklistItemInput): Promise<ChecklistItemRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).update(updates).eq('id', id).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeChecklistItem(data as ChecklistItemRow | null);
  if (!record) {
    throw new Error('Checklist item not found.');
  }
  return record;
};

export const deleteChecklistItem = async (id: string): Promise<ChecklistItemRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).delete().eq('id', id).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeChecklistItem(data as ChecklistItemRow | null);
  if (!record) {
    throw new Error('Checklist item not found.');
  }
  return record;
};

export const listChecklistItems = async (
  options: ListChecklistItemsOptions = {}
): Promise<ListChecklistItemsResult> => {
  const limit = clampLimit(options.limit);
  const page = clampPage(options.page);
  const { start, end } = getRangeBounds(limit, page);
  const query = supabaseAdmin.from(TABLE_NAME).select('*', { count: 'exact' });
  applyFilters(query, options);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, end);
  if (error) {
    throw error;
  }
  const rows = (Array.isArray(data) ? data : []) as ChecklistItemRow[];
  return {
    data: rows.map(row => normalizeChecklistItem(row)).filter((row): row is ChecklistItemRecord => row !== null),
    count: typeof count === 'number' ? count : null,
    limit,
    page
  };
};
