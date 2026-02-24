import { supabaseAdmin } from './supabase';
import { clampLimit, clampPage, getRangeBounds } from './pagination';

type DocumentRow = {
  id: string;
  created_at: string;
  deal_id: string | null;
  name: string | null;
  type: string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
};

export type DocumentRecord = {
  id: string;
  created_at: string;
  deal_id: string | null;
  name: string | null;
  type: string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
};

export type CreateDocumentInput = {
  deal_id?: string | null;
  name?: string | null;
  type?: string | null;
  url?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type UpdateDocumentInput = Partial<CreateDocumentInput>;

export type ListDocumentsOptions = {
  limit?: number;
  page?: number;
  deal_id?: string;
  type?: string;
};

export type ListDocumentsResult = {
  data: DocumentRecord[];
  count: number | null;
  limit: number;
  page: number;
};

const TABLE_NAME = 'documents';

const normalizeDocument = (row: DocumentRow | null): DocumentRecord | null => {
  if (!row) return null;
  return {
    id: row.id,
    created_at: row.created_at,
    deal_id: row.deal_id,
    name: row.name,
    type: row.type,
    url: row.url,
    metadata: row.metadata ?? null
  };
};

const applyFilters = (query: any, options: ListDocumentsOptions) => {
  if (options.deal_id !== undefined && options.deal_id !== null && options.deal_id !== '') {
    query.eq('deal_id', options.deal_id);
  }
  if (options.type !== undefined && options.type !== null && options.type !== '') {
    query.eq('type', options.type);
  }
};

export const createDocument = async (payload: CreateDocumentInput): Promise<DocumentRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).insert(payload).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeDocument(data as DocumentRow | null);
  if (!record) {
    throw new Error('Failed to create document.');
  }
  return record;
};

export const getDocument = async (id: string): Promise<DocumentRecord | null> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).select('*').eq('id', id).maybeSingle();
  if (error) {
    throw error;
  }
  return normalizeDocument(data as DocumentRow | null);
};

export const updateDocument = async (id: string, updates: UpdateDocumentInput): Promise<DocumentRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).update(updates).eq('id', id).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeDocument(data as DocumentRow | null);
  if (!record) {
    throw new Error('Document not found.');
  }
  return record;
};

export const deleteDocument = async (id: string): Promise<DocumentRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).delete().eq('id', id).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeDocument(data as DocumentRow | null);
  if (!record) {
    throw new Error('Document not found.');
  }
  return record;
};

export const listDocuments = async (options: ListDocumentsOptions = {}): Promise<ListDocumentsResult> => {
  const limit = clampLimit(options.limit);
  const page = clampPage(options.page);
  const { start, end } = getRangeBounds(limit, page);
  const query = supabaseAdmin.from(TABLE_NAME).select('*', { count: 'exact' });
  applyFilters(query, options);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, end);
  if (error) {
    throw error;
  }
  const rows = (Array.isArray(data) ? data : []) as DocumentRow[];
  return {
    data: rows.map(row => normalizeDocument(row)).filter((row): row is DocumentRecord => row !== null),
    count: typeof count === 'number' ? count : null,
    limit,
    page
  };
};
