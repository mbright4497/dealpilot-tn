"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.sendTextMessage = void 0;
const fetch = globalThis.fetch || (() => { try {
    return require('undici').fetch;
}
catch (e) {
    return undefined;
} })();
const GRAPH = 'https://graph.facebook.com/v16.0';
const getToken = (pageConfig) => pageConfig?.whatsapp_token || process.env.WHATSAPP_TOKEN;
const getPhoneId = (pageConfig) => pageConfig?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
const sendTextMessage = async (to, text, pageConfig) => {
    const token = getToken(pageConfig);
    const phoneId = getPhoneId(pageConfig);
    const url = `${GRAPH}/${phoneId}/messages`;
    const body = { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok)
        throw new Error(`WhatsApp API error ${res.status}`);
    return res.json();
};
exports.sendTextMessage = sendTextMessage;
const markAsRead = async (messageId, pageConfig) => {
    const token = getToken(pageConfig);
    const phoneId = getPhoneId(pageConfig);
    const url = `${GRAPH}/${phoneId}/messages`;
    const body = { messaging_product: 'whatsapp', status: 'read', message_id: messageId };
    await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
};
exports.markAsRead = markAsRead;
exports.default = { sendTextMessage: exports.sendTextMessage, markAsRead: exports.markAsRead };
