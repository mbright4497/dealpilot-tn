import GHLProvider from './ghl-provider';
import KWCommandProvider from './kw-provider';
import { supabaseAdmin } from './supabase';
import type { CrmProvider } from '../types/crm';

const providers: Record<string, CrmProvider> = {
  GHL: GHLProvider(),
  KW: KWCommandProvider()
};

export const syncContactToCrm = async (crm: 'GHL'|'KW', contact: any, transactionId?: string) => {
  try {
    const p = providers[crm];
    const res = await p.syncContact(contact);
    await supabaseAdmin.from('crm_sync_log').insert({ transaction_id: transactionId || null, crm_system: crm, operation: 'contact_synced', request_payload: contact, response_status: res?.ok?200:500, error_message: res?.message||null });
    return res;
  } catch (e:any) {
    await supabaseAdmin.from('crm_sync_log').insert({ transaction_id: transactionId || null, crm_system: crm, operation: 'contact_synced', request_payload: contact, response_status: 500, error_message: String(e) });
    return { ok: false };
  }
};

export const syncDealToCrm = async (crm: 'GHL'|'KW', tx:any) => {
  try {
    const p = providers[crm];
    const res = await p.syncDeal(tx);
    await supabaseAdmin.from('crm_sync_log').insert({ transaction_id: tx.id, crm_system: crm, operation: 'deal_synced', request_payload: tx, response_status: res?.ok?200:500, error_message: res?.message||null });
    return res;
  } catch (e:any) {
    await supabaseAdmin.from('crm_sync_log').insert({ transaction_id: tx.id, crm_system: crm, operation: 'deal_synced', request_payload: tx, response_status: 500, error_message: String(e) });
    return { ok: false };
  }
};

export const updateCrmStage = async (crm: 'GHL'|'KW', opportunityId:string, stage:string, txId?:string) => {
  try {
    const p = providers[crm];
    const res = await p.updateStage(opportunityId, stage);
    await supabaseAdmin.from('crm_sync_log').insert({ transaction_id: txId||null, crm_system: crm, operation: 'stage_updated', request_payload: { opportunityId, stage }, response_status: res?.ok?200:500, error_message: res?.message||null });
    return res;
  } catch (e:any) {
    await supabaseAdmin.from('crm_sync_log').insert({ transaction_id: txId||null, crm_system: crm, operation: 'stage_updated', request_payload: { opportunityId, stage }, response_status: 500, error_message: String(e) });
    return { ok: false };
  }
};

export default { syncContactToCrm, syncDealToCrm, updateCrmStage };
