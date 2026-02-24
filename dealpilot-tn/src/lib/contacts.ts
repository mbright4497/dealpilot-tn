import { supabaseAdmin } from './supabase';
import { clampLimit, clampPage, getRangeBounds } from './pagination';

type ContactRow = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  metadata: Record<string, unknown> | null;
};

export type ContactRecord = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  metadata: Record<string, unknown> | null;
};

export type CreateContactInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type UpdateContactInput = Partial<CreateContactInput>;

export type ListContactsOptions = {
  limit?: number;
  page?: number;
  name?: string;
  email?: string;
  phone?: string;
};

export type ListContactsResult = {
  data: ContactRecord[];
  count: number | null;
  limit: number;
  page: number;
};

const TABLE_NAME = 'contacts';

const normalizeContact = (row: ContactRow | null): ContactRecord | null => {
  if (!row) return null;
  return {
    id: row.id,
    created_at: row.created_at,
    name: row.name,
    email: row.email,
    phone: row.phone,
    metadata: row.metadata ?? null
  };
};

const applyFilters = (query: any, options: ListContactsOptions) => {
  if (options.name !== undefined && options.name !== null && options.name !== '') {
    query.eq('name', options.name);
  }
  if (options.email !== undefined && options.email !== null && options.email !== '') {
    query.eq('email', options.email);
  }
  if (options.phone !== undefined && options.phone !== null && options.phone !== '') {
    query.eq('phone', options.phone);
  }
};

export const createContact = async (payload: CreateContactInput): Promise<ContactRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).insert(payload).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeContact(data as ContactRow | null);
  if (!record) {
    throw new Error('Failed to create contact.');
  }
  return record;
};

export const getContact = async (id: string): Promise<ContactRecord | null> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).select('*').eq('id', id).maybeSingle();
  if (error) {
    throw error;
  }
  return normalizeContact(data as ContactRow | null);
};

export const updateContact = async (id: string, updates: UpdateContactInput): Promise<ContactRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).update(updates).eq('id', id).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeContact(data as ContactRow | null);
  if (!record) {
    throw new Error('Contact not found.');
  }
  return record;
};

export const deleteContact = async (id: string): Promise<ContactRecord> => {
  const { data, error } = await supabaseAdmin.from(TABLE_NAME).delete().eq('id', id).select('*').single();
  if (error) {
    throw error;
  }
  const record = normalizeContact(data as ContactRow | null);
  if (!record) {
    throw new Error('Contact not found.');
  }
  return record;
};

export const listContacts = async (options: ListContactsOptions = {}): Promise<ListContactsResult> => {
  const limit = clampLimit(options.limit);
  const page = clampPage(options.page);
  const { start, end } = getRangeBounds(limit, page);
  const query = supabaseAdmin.from(TABLE_NAME).select('*', { count: 'exact' });
  applyFilters(query, options);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, end);
  if (error) {
    throw error;
  }
  const rows = (Array.isArray(data) ? data : []) as ContactRow[];
  return {
    data: rows.map(row => normalizeContact(row)).filter((row): row is ContactRecord => row !== null),
    count: typeof count === 'number' ? count : null,
    limit,
    page
  };
};
