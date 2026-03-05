import { composeMessage } from './message-composer'
import { sendSmsViaGhl, sendEmailViaGhl, findOrCreateContact } from '@/lib/ghl-messaging'
import { createBrowserClient } from '@/lib/supabase-browser'

const supabase = createBrowserClient()

export async function evaComposeAndSend(dealId: number | string, contactId: string, channel: 'sms'|'email'|'whatsapp', templateKey: string, overrides?: any){
  // fetch deal context
  const { data: tx } = await supabase.from('transactions').select('*').eq('id', dealId).single()
  if(!tx) throw new Error('Deal not found')

  const dealContext = {
    id: tx.id,
    address: tx.property_address || tx.address || '',
    client_name: tx.client_name || tx.client || '',
    status: tx.status || '',
    closing_date: tx.closing_date || null,
    deadlines: [],
    agent_name: '',
    brokerage: 'iHome Team',
  }

  // pull agent metadata
  try{
    const { data: user } = await supabase.auth.getUser() as any
    dealContext.agent_name = user?.data?.user?.user_metadata?.full_name || user?.data?.user?.email || 'Your Agent'
  }catch(e){ /* ignore */ }

  const draft = await composeMessage({ dealContext, contactName: overrides?.contactName || dealContext.client_name, contactRole: overrides?.contactRole || 'buyer', messageType: channel === 'email' ? 'email' : 'sms', purpose: templateKey, customPrompt: overrides?.customPrompt })

  // send
  let sendResult:any = null
  if(channel === 'sms'){
    sendResult = await sendSmsViaGhl(contactId, draft.body)
  }else if(channel === 'email'){
    sendResult = await sendEmailViaGhl(contactId, draft.subject || '', draft.body)
  }else if(channel === 'whatsapp'){
    // treat like sms for now via ghl-messaging (assumed supported)
    sendResult = await sendSmsViaGhl(contactId, draft.body)
  }

  // log to message_logs
  try{
    await supabase.from('message_logs').insert([{ deal_id: dealId, contact_id: contactId, channel, template_key: templateKey, message_body: draft.body, sent_at: new Date().toISOString(), ghl_message_id: sendResult?.id || null, status: 'sent' }])
  }catch(e){ console.error('message log failed', e) }

  return { draft, sendResult }
}
