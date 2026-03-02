'use client'
import useSWR from 'swr';
import { getAll, create, update, remove } from './api';

const fetcher = (table: string) => getAll(table);

export const useContacts = () => {
  const { data, error, mutate } = useSWR('contacts', fetcher);
  return {
    data: data ? { data } : undefined,
    error,
    mutate,
    addContact: async (body: any) => { await create('contacts', body); mutate(); },
    removeContact: async (id: string) => { await remove('contacts', id); mutate(); },
  };
};

export const useDeals = () => {
  const { data, error, mutate } = useSWR('deals', fetcher);
  return {
    data: data ? { data } : undefined,
    error,
    mutate,
    addDeal: async (body: any) => { await create('deals', body); mutate(); },
    removeDeal: async (id: string) => { await remove('deals', id); mutate(); },
  };
};

export const useDocuments = () => {
  const { data, error, mutate } = useSWR('documents', fetcher);
  return {
    data: data ? { data } : undefined,
    error,
    mutate,
    addDocument: async (body: any) => { await create('documents', body); mutate(); },
    removeDocument: async (id: string) => { await remove('documents', id); mutate(); },
  };
};

export const useChecklists = () => {
  const { data, error, mutate } = useSWR('checklists', fetcher);
  return {
    data: data ? { data } : undefined,
    error,
    mutate,
    addChecklist: async (body: any) => { await create('checklists', body); mutate(); },
    removeChecklist: async (id: string) => { await remove('checklists', id); mutate(); },
  };
};

export const useOffers = () => {
  const { data, error, mutate } = useSWR('offer_scores', fetcher);
  return {
    data: data ? { data } : undefined,
    error,
    mutate,
    addOffer: async (body: any) => { await create('offer_scores', body); mutate(); },
    removeOffer: async (id: string) => { await remove('offer_scores', id); mutate(); },
  };
};

export const useTimeline = (dealId?: string) => {
  const key = dealId ? `activity_log_${dealId}` : null;
  const { data, error, mutate } = useSWR(key, async () => {
    const { createBrowserClient: createBrowserSupabaseClient } = await import('./supabase-browser');
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.from('activity_log').select('*').eq('deal_id', dealId!).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  });
  return { data: data ? { data } : undefined, error, mutate };
};

export default { useContacts, useDeals, useDocuments, useChecklists, useOffers, useTimeline };
