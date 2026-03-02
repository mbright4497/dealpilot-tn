import { createBrowserClient as createBrowserSupabaseClient } from './supabase-browser';

const supabase = createBrowserSupabaseClient();

export const getAll = async (table: string) => {
  const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getById = async (table: string, id: string) => {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const create = async (table: string, body: any) => {
  const { data, error } = await supabase.from(table).insert(body).select().single();
  if (error) throw error;
  return data;
};

export const update = async (table: string, id: string, body: any) => {
  const { data, error } = await supabase.from(table).update(body).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const remove = async (table: string, id: string) => {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
};

export default { getAll, getById, create, update, remove };
