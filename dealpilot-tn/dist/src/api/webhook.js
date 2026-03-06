"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const agent_orchestrator_1 = require("../lib/agent-orchestrator");
const supabaseClient_1 = require("../lib/supabaseClient");
const whatsapp_client_1 = __importDefault(require("../lib/whatsapp-client"));
const router = express_1.default.Router();
const verifySignature = (req, appSecret) => {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature)
        return false;
    const body = req.rawBody || JSON.stringify(req.body);
    const hmac = crypto_1.default.createHmac('sha256', appSecret).update(body).digest('hex');
    return signature.includes(hmac);
};
router.get('/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN)
        return res.status(200).send(challenge);
    return res.sendStatus(403);
});
router.post('/whatsapp', express_1.default.json({ verify: (req, res, buf) => { req.rawBody = buf.toString(); } }), async (req, res) => {
    try {
        const appSecret = process.env.WHATSAPP_APP_SECRET || '';
        if (appSecret && !verifySignature(req, appSecret))
            return res.sendStatus(403);
        const entry = req.body?.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;
        if (!messages || messages.length === 0)
            return res.sendStatus(200);
        const message = messages[0];
        const from = message.from; // phone
        const text = message.text?.body || '';
        const phoneNumberId = changes?.value?.metadata?.phone_number_id || value?.metadata?.phone_number_id;
        // lookup page config
        const page = await supabaseClient_1.supabaseClient.from('whatsapp_pages').select('*').eq('phone_number_id', phoneNumberId).maybeSingle();
        const pageConfig = page?.data ?? null;
        // lookup deal by contact phone
        const contact = await supabaseClient_1.supabaseClient.from('contacts').select('*').ilike('phone', `%${from}%`).maybeSingle();
        const dealId = contact?.data?.deal_id || null;
        const intentText = text;
        const response = dealId ? await (0, agent_orchestrator_1.orchestrate)(dealId, `whatsapp:${from}`, intentText) : 'Could not find deal for this number.';
        // send reply
        if (pageConfig) {
            await whatsapp_client_1.default.sendTextMessage(from, response, pageConfig);
        }
        else {
            await whatsapp_client_1.default.sendTextMessage(from, response);
        }
        res.sendStatus(200);
    }
    catch (e) {
        console.error('webhook error', e);
        res.sendStatus(500);
    }
});
exports.default = router;
