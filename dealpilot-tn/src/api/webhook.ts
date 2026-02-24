import express from 'express';
import crypto from 'crypto';
import { orchestrate } from '../lib/agent-orchestrator';
import { supabaseClient, supabaseAdmin } from '../lib/supabaseClient';
import whatsappClient from '../lib/whatsapp-client';

const router = express.Router();

const verifySignature = (req: any, appSecret: string) => {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) return false;
  const body = req.rawBody || JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', appSecret).update(body).digest('hex');
  return signature.includes(hmac);
};

router.get('/whatsapp', (req,res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

router.post('/whatsapp', express.json({ verify: (req:any,res,buf)=>{ req.rawBody = buf.toString(); } }), async (req,res) => {
  try {
    const appSecret = process.env.WHATSAPP_APP_SECRET || '';
    if (appSecret && !verifySignature(req, appSecret)) return res.sendStatus(403);
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;
    if (!messages || messages.length===0) return res.sendStatus(200);
    const message = messages[0];
    const from = message.from; // phone
    const text = message.text?.body || '';
    const phoneNumberId = changes?.value?.metadata?.phone_number_id || value?.metadata?.phone_number_id;

    // lookup page config
    const page = await supabaseClient.from('whatsapp_pages').select('*').eq('phone_number_id', phoneNumberId).maybeSingle();
    const pageConfig = page?.data ?? null;

    // lookup deal by contact phone
    const contact = await supabaseClient.from('contacts').select('*').ilike('phone', `%${from}%`).maybeSingle();
    const dealId = contact?.data?.deal_id || null;

    const intentText = text;
    const response = dealId ? await orchestrate(dealId, `whatsapp:${from}`, intentText) : 'Could not find deal for this number.';

    // send reply
    if (pageConfig) {
      await whatsappClient.sendTextMessage(from, response, pageConfig);
    } else {
      await whatsappClient.sendTextMessage(from, response);
    }

    res.sendStatus(200);
  } catch (e) {
    console.error('webhook error', e);
    res.sendStatus(500);
  }
});

export default router;
