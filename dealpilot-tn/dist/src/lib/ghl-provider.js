"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GHLProvider = void 0;
const supabase_1 = require("./supabase");
const undici_1 = __importDefault(require("undici"));
const GHL_BASE = (key) => `https://api.gohighlevel.com/v1`;
const MAX_RETRIES = 3;
const retryFetch = async (url, opts, retries = MAX_RETRIES) => {
    try {
        const res = await undici_1.default.fetch(url, opts);
        return res;
    }
    catch (e) {
        if (retries > 0)
            return retryFetch(url, opts, retries - 1);
        throw e;
    }
};
const GHLProvider = () => ({
    syncContact: async (contact) => {
        // mock implementation: log to crm_sync_log
        const log = { crm_system: 'GHL', operation: 'contact_synced', request_payload: contact };
        await supabase_1.supabaseAdmin.from('crm_sync_log').insert(log);
        return { ok: true };
    },
    syncDeal: async (transaction) => {
        const log = { crm_system: 'GHL', operation: 'deal_synced', request_payload: transaction };
        await supabase_1.supabaseAdmin.from('crm_sync_log').insert(log);
        return { ok: true };
    },
    updateStage: async (opportunityId, stage) => {
        const log = { crm_system: 'GHL', operation: 'stage_updated', request_payload: { opportunityId, stage } };
        await supabase_1.supabaseAdmin.from('crm_sync_log').insert(log);
        return { ok: true };
    },
    getContact: async (contactId) => {
        return { id: contactId, name: 'Test' };
    }
});
exports.GHLProvider = GHLProvider;
exports.default = exports.GHLProvider;
