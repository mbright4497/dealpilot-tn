"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCrmStage = exports.syncDealToCrm = exports.syncContactToCrm = void 0;
const ghl_provider_1 = __importDefault(require("./ghl-provider"));
const kw_provider_1 = __importDefault(require("./kw-provider"));
const supabase_1 = require("./supabase");
const providers = {
    GHL: (0, ghl_provider_1.default)(),
    KW: (0, kw_provider_1.default)()
};
const syncContactToCrm = async (crm, contact, transactionId) => {
    try {
        const p = providers[crm];
        const res = await p.syncContact(contact);
        await supabase_1.supabaseAdmin.from('crm_sync_log').insert({ transaction_id: transactionId || null, crm_system: crm, operation: 'contact_synced', request_payload: contact, response_status: res?.ok ? 200 : 500, error_message: res?.message || null });
        return res;
    }
    catch (e) {
        await supabase_1.supabaseAdmin.from('crm_sync_log').insert({ transaction_id: transactionId || null, crm_system: crm, operation: 'contact_synced', request_payload: contact, response_status: 500, error_message: String(e) });
        return { ok: false };
    }
};
exports.syncContactToCrm = syncContactToCrm;
const syncDealToCrm = async (crm, tx) => {
    try {
        const p = providers[crm];
        const res = await p.syncDeal(tx);
        await supabase_1.supabaseAdmin.from('crm_sync_log').insert({ transaction_id: tx.id, crm_system: crm, operation: 'deal_synced', request_payload: tx, response_status: res?.ok ? 200 : 500, error_message: res?.message || null });
        return res;
    }
    catch (e) {
        await supabase_1.supabaseAdmin.from('crm_sync_log').insert({ transaction_id: tx.id, crm_system: crm, operation: 'deal_synced', request_payload: tx, response_status: 500, error_message: String(e) });
        return { ok: false };
    }
};
exports.syncDealToCrm = syncDealToCrm;
const updateCrmStage = async (crm, opportunityId, stage, txId) => {
    try {
        const p = providers[crm];
        const res = await p.updateStage(opportunityId, stage);
        await supabase_1.supabaseAdmin.from('crm_sync_log').insert({ transaction_id: txId || null, crm_system: crm, operation: 'stage_updated', request_payload: { opportunityId, stage }, response_status: res?.ok ? 200 : 500, error_message: res?.message || null });
        return res;
    }
    catch (e) {
        await supabase_1.supabaseAdmin.from('crm_sync_log').insert({ transaction_id: txId || null, crm_system: crm, operation: 'stage_updated', request_payload: { opportunityId, stage }, response_status: 500, error_message: String(e) });
        return { ok: false };
    }
};
exports.updateCrmStage = updateCrmStage;
exports.default = { syncContactToCrm: exports.syncContactToCrm, syncDealToCrm: exports.syncDealToCrm, updateCrmStage: exports.updateCrmStage };
