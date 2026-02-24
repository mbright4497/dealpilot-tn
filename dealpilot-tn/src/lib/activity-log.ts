import { supabaseAdmin } from './supabase';
import { clampLimit, clampPage, getRangeBounds } from './pagination';

type ActivityLogRow = {
  id: string;
  created_at: string;
  deal_id: string | null;
  actor: string | null;
  action: string | null;
  detail: Record<string, unknown> | null;
};

export type ActivityLogRecord = {
  id: string;
  created_at: string;
  deal_id: string | null;
  actor: string | null;
  action: string | null;
  detail: Record<string, unknown> | null;
};

export type CreateActivityLogInput = {
  deal_id?: string | null;
  actor?: string | null;
  action?: string | null;
  detail?: Record<string, unknown> | null;
};

export type UpdateActivityLogInput = Partial<CreateActivityLogInput>;

export type ListActivityLogOptions = {
  limit?: number;
  page?: number;
  deal_id?: string;
  actor?: string;
  action?: string;
};

export type ListActivityLogResult = {
  data: ActivityLogRecord[];
  count: number | null;
  limit: number;
  page: number;
};

const TABLE_NAME = 'activity_log';

const normalizeActivityLog = (row: ActivityLogRow | null): ActivityLogRecord | null => {
  if (!row) return null;
  return {
    id: row.id,
    created_at: row.created_at,
    deal_id: row.deal_id,
    actor: row.actor,
    action: row.action,
    detail: row.detail ?? null
  };
};

const applyFilters = (query: any, options: ListActivityLogOptions) => {
  if (options.deal_id !== undefined && options.deal_id !== null && options.deal_id !== '') {
    query.eq('deal_id', options.deal_id);
  }
  if (options.actor !== undefined && options.actor !== null && options.actor !== '') {
    query.eq('actor', options.actor);
  }
  if (options.action !== undefined && options.action !== null && options.action !== '') {
    query.eq('action', options.action);
  }
};

export const createActivityLog = async (payload: CreateActivityLogInput): Promise<ActivityLogRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).insert(payload).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeActivityLog(data as ActivityLogRow | null);
  if (!record) {
    throw new Error('Failed to create activity log entry.');
  }
  return record;
};

export const getActivityLog = async (id: string): Promise<ActivityLogRecord | null> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).select('*').eq('id', id).maybeSingle();
  if (error) {
    throw error;
  }
  return normalizeActivityLog(data as ActivityLogRow | null);
};

export const updateActivityLog = async (id: string, updates: UpdateActivityLogInput): Promise<ActivityLogRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).update(updates).eq('id', id).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeActivityLog(data as ActivityLogRow | null);
  if (!record) {
    throw new Error('Activity log entry not found.');
  }
  return record;
};

export const deleteActivityLog = async (id: string): Promise<ActivityLogRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).delete().eq('id', id).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeActivityLog(data as ActivityLogRow | null);
  if (!record) {
    throw new Error('Activity log entry not found.');
  }
  return record;
};

export const listActivityLog = async (options: ListActivityLogOptions = {}): Promise<ListActivityLogResult> => {
  const limit = clampLimit(options.limit);
  const page = clampPage(options.page);
  const { start, end } = getRangeBounds(limit, page);
  const query = supabaseAdmin.from(TABLE_NAME).select('*', { count: 'exact' });
  applyFilters(query, options);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, end);
  if (error) {
    throw error;
  }
  const rows = (Array.isArray(data) ? data : []) as ActivityLogRow[];
  return {
    data: rows.map(row => normalizeActivityLog(row)).filter((row): row is ActivityLogRecord => row !== null),
    count: typeof count === 'number' ? count : null,
    limit,
    page
  };
};
