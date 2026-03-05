import { openai } from '@/lib/openai/client'
import { TEMPLATES } from './message-templates'
import { getTransactionConfig } from '@/lib/transaction-phases'

export type DealContext = {
  id:number,
  address?:string,
  client_name?:string,
  status?:string,
  closing_date?:string|null,
  deadlines?:{name:string,date:string}[],
  agent_name?:string,
  brokerage?:string,
}

export async function composeMessage(params: { dealContext: DealContext, contactName: string, contactRole: 'buyer'|'seller'|'agent'|'lender'|'title', messageType: 'sms'|'email', purpose: string, customPrompt?: string }): Promise<{ subject?:string, body:string }>{
  const { dealContext, contactName, messageType, purpose, customPrompt } = params
  const template = TEMPLATES[purpose] || TEMPLATES['custom']

  const filled = template
    .replace(/{{address}}/g, dealContext.address || 'the property')
    .replace(/{{client_name}}/g, contactName || (dealContext.client_name||'Client'))
    .replace(/{{closing_date}}/g, dealContext.closing_date || '')
    .replace(/{{agent_name}}/g, dealContext.agent_name || 'Your Agent')
    .replace(/{{brokerage}}/g, dealContext.brokerage || '')
    .replace(/{{status}}/g, dealContext.status || '')
    .replace(/{{next_milestone}}/g, '')

  const system = `You are an assistant that writes concise professional real estate messages for Tennessee (Tri-Cities) transactions. Tone should follow the agent personality: friendly, professional, concise.`
  const userPrompt = messageType === 'sms'
    ? `Write a short SMS under 160 characters using this draft: "${filled}"` 
    : `Write a professional email with greeting and signature using this draft: "${filled}"`

  const finalPrompt = customPrompt ? `${userPrompt}\n\nAdditional instructions: ${customPrompt}` : userPrompt

  const resp = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: system }, { role: 'user', content: finalPrompt }], max_tokens: 400 })
  const text = resp.choices?.[0]?.message?.content || ''

  if(messageType === 'email'){
    // try parse subject from AI if present
    const lines = text.split('\n')
    let subject = ''
    if(lines[0].toLowerCase().startsWith('subject:')){
      subject = lines[0].replace(/subject:\s*/i,'').trim()
    }
    return { subject: subject || undefined, body: text }
  }
  return { body: text }
}
