import type { CrmProvider } from '../types/crm';
import { supabaseAdmin } from './supabase';

export const KWCommandProvider = (): CrmProvider => ({
  syncContact: async (contact) => {
    await supabaseAdmin.from('crm_sync_log').insert({ crm_system: 'KW', operation: 'contact_synced', request_payload: contact });
    return { ok: false, message: 'KW provider not configured' };
  },
  syncDeal: async (transaction) => {
    await supabaseAdmin.from('crm_sync_log').insert({ crm_system: 'KW', operation: 'deal_synced', request_payload: transaction });
    return { ok: false, message: 'KW provider not configured' };
  },
  updateStage: async (opportunityId, stage) => {
    await supabaseAdmin.from('crm_sync_log').insert({ crm_system: 'KW', operation: 'stage_updated', request_payload: { opportunityId, stage } });
    return { ok: false, message: 'KW provider not configured' };
  },
  getContact: async (contactId) => ({ ok: false, message: 'not configured' })
});

export default KWCommandProvider;
