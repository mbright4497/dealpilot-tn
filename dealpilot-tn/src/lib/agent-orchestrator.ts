import { classifyIntent, route } from './conversation-router';
import { supabaseAdmin } from './supabase';

const CONV_TABLE = 'conversation_log';

export const orchestrate = async (dealId: string, sender: string, message: string) => {
  const intent = classifyIntent(message);
  // log inbound
  // Log inbound (don't rely on .select() in tests/mocks)
  await supabaseAdmin.from(CONV_TABLE).insert({ deal_id: dealId, sender, message, intent });
  const response = await route(intent, dealId, message);
  // log response
  await supabaseAdmin.from(CONV_TABLE).insert({ deal_id: dealId, sender: 'system', message: '', intent, response });
  return response;
};

export default { orchestrate };
