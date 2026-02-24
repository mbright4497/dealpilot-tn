import { supabaseAdmin } from './supabase';
import type { TimelineEvent } from '../../src/types';

export const persistTimelineEvents = async (dealId: string, events: TimelineEvent[]) => {
  // defensive: ensure we don't call Supabase when there's nothing to persist
  if (!events || !Array.isArray(events) || events.length === 0) {
    return;
  }
  const payload = events.map(e => ({
    id: e.id,
    deal_id: dealId,
    name: e.name,
    due_date: e.due_date,
    category: e.tags?.[0] ?? null,
    owner: e.owner,
    metadata: {
      tags: e.tags,
      disposition: e.metadata?.disposition,
      source_form: e.source_form,
      description: e.description,
      ...e.metadata
    }
  }));
  // defensive: ensure we never call upsert with an empty payload (protects against mocks/tools)
  if (!payload || !Array.isArray(payload) || payload.length === 0) return;
  await supabaseAdmin.from('deadlines').upsert(payload, { onConflict: 'id' });
};

export const getDeadlinesForDeal = async (dealId: string) => {
  const select = supabaseAdmin.from('deadlines').select('*');
  // @ts-ignore - chain mocked in tests
  const rows = await select.eq('deal_id', dealId).order('due_date', { ascending: true });
  // when mocked, rows may be a QueryResult { data, error } or an array directly
  let data: any[] | null = null;
  if (rows && typeof rows === 'object' && 'data' in rows) {
    data = rows.data as any[] | null;
  } else if (Array.isArray(rows)) {
    data = rows;
  }
  if (!data || !Array.isArray(data)) {
    // If the mocked response included an error, surface a warning for tests
    if (rows && typeof rows === 'object' && 'error' in rows && rows.error) {
      console.warn('Failed to read deadlines', rows.error);
    }
    return [];
  }
  return data.map(r => ({
    id: r.id,
    name: r.name,
    due_date: r.due_date,
    tags: r.metadata?.tags ?? [],
    owner: r.owner,
    description: r.metadata?.description,
    source_form: r.metadata?.source_form,
    metadata: r.metadata
  }));
};
