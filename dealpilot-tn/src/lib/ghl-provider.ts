import { supabaseAdmin } from './supabase';
import fetch from 'undici';
import type { CrmProvider, CrmSyncLog } from '../types/crm';

const GHL_BASE = (key?:string) => `https://api.gohighlevel.com/v1`;
const MAX_RETRIES = 3;

const retryFetch = async (url:string, opts:any, retries=MAX_RETRIES) => {
  try {
    const res = await fetch.fetch(url, opts);
    return res;
  } catch (e) {
    if (retries>0) return retryFetch(url, opts, retries-1);
    throw e;
  }
};

export const GHLProvider = (): CrmProvider => ({
  syncContact: async (contact) => {
    // mock implementation: log to crm_sync_log
    const log: CrmSyncLog = { crm_system: 'GHL', operation: 'contact_synced', request_payload: contact };
    await supabaseAdmin.from('crm_sync_log').insert(log);
    return { ok: true };
  },
  syncDeal: async (transaction) => {
    const log: CrmSyncLog = { crm_system: 'GHL', operation: 'deal_synced', request_payload: transaction };
    await supabaseAdmin.from('crm_sync_log').insert(log);
    return { ok: true };
  },
  updateStage: async (opportunityId, stage) => {
    const log: CrmSyncLog = { crm_system: 'GHL', operation: 'stage_updated', request_payload: { opportunityId, stage } };
    await supabaseAdmin.from('crm_sync_log').insert(log);
    return { ok: true };
  },
  getContact: async (contactId) => {
    return { id: contactId, name: 'Test' };
  }
});

export default GHLProvider;
