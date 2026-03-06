"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KWCommandProvider = void 0;
const supabase_1 = require("./supabase");
const KWCommandProvider = () => ({
    syncContact: async (contact) => {
        await supabase_1.supabaseAdmin.from('crm_sync_log').insert({ crm_system: 'KW', operation: 'contact_synced', request_payload: contact });
        return { ok: false, message: 'KW provider not configured' };
    },
    syncDeal: async (transaction) => {
        await supabase_1.supabaseAdmin.from('crm_sync_log').insert({ crm_system: 'KW', operation: 'deal_synced', request_payload: transaction });
        return { ok: false, message: 'KW provider not configured' };
    },
    updateStage: async (opportunityId, stage) => {
        await supabase_1.supabaseAdmin.from('crm_sync_log').insert({ crm_system: 'KW', operation: 'stage_updated', request_payload: { opportunityId, stage } });
        return { ok: false, message: 'KW provider not configured' };
    },
    getContact: async (contactId) => ({ ok: false, message: 'not configured' })
});
exports.KWCommandProvider = KWCommandProvider;
exports.default = exports.KWCommandProvider;
