"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orchestrate = void 0;
const conversation_router_1 = require("./conversation-router");
const supabase_1 = require("./supabase");
const CONV_TABLE = 'conversation_log';
const orchestrate = async (dealId, sender, message) => {
    const intent = (0, conversation_router_1.classifyIntent)(message);
    // log inbound
    // Log inbound (don't rely on .select() in tests/mocks)
    await supabase_1.supabaseAdmin.from(CONV_TABLE).insert({ deal_id: dealId, sender, message, intent });
    const response = await (0, conversation_router_1.route)(intent, dealId, message);
    // log response
    await supabase_1.supabaseAdmin.from(CONV_TABLE).insert({ deal_id: dealId, sender: 'system', message: '', intent, response });
    return response;
};
exports.orchestrate = orchestrate;
exports.default = { orchestrate: exports.orchestrate };
