const fetch = (globalThis as any).fetch || (() => { try { return require('undici').fetch } catch (e) { return undefined } })();
const GRAPH = 'https://graph.facebook.com/v16.0';

const getToken = (pageConfig: any) => pageConfig?.whatsapp_token || process.env.WHATSAPP_TOKEN;
const getPhoneId = (pageConfig: any) => pageConfig?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;

export const sendTextMessage = async (to: string, text: string, pageConfig?: any) => {
  const token = getToken(pageConfig);
  const phoneId = getPhoneId(pageConfig);
  const url = `${GRAPH}/${phoneId}/messages`;
  const body = { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`WhatsApp API error ${res.status}`);
  return res.json();
};

export const markAsRead = async (messageId: string, pageConfig?: any) => {
  const token = getToken(pageConfig);
  const phoneId = getPhoneId(pageConfig);
  const url = `${GRAPH}/${phoneId}/messages`;
  const body = { messaging_product: 'whatsapp', status: 'read', message_id: messageId };
  await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
};

export default { sendTextMessage, markAsRead };
