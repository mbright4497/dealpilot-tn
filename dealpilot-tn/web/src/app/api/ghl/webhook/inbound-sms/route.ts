import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function callEva(incomingText: string){
  // call local EVA chat API with system prompt override
  const system = `You are an automated Transaction Coordinator. Analyze this SMS reply from a Lender. If they are confirming a milestone (e.g., 'Appraisal is back', 'Clear to close', 'Inspection complete'), return a JSON object with a single property \"milestone\" whose value is a short identifier for the milestone (e.g., \"appraisal_received\", \"clear_to_close\", \"inspection_complete\"). If no milestone is identified, return {\"milestone\": null}. Respond with JSON only.`
  const payload = { messages: [ { role: 'system', content: system }, { role: 'user', content: incomingText } ] }
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/eva/chat`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
  if(!res.ok) throw new Error('eva chat failed')
  const j = await res.json().catch(()=>({}))
  // try to locate textual reply
  const txt = (j.reply || j.message || j.summary || JSON.stringify(j) || '')
  // extract JSON substring if present
  const jsonMatch = txt.match(/\{[\s\S]*\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : txt
  try{ return JSON.parse(jsonStr) }catch(e){ return { milestone: null, raw: txt } }
}

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=>({})) as any
    // expected fields: phone, text, contact_id, maybe conversation_id
    const phone = (body?.from || body?.phone || body?.sender || body?.msisdn || '')
    const text = body?.text || body?.message || body?.body || ''
    if(!phone || !text) return NextResponse.json({ error: 'phone and text required' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    if(!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'supabase not configured' }, { status: 500 })
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // try to map phone -> deal via contacts -> deal_contacts
    const normPhone = String(phone).replace(/[^0-9]/g,'')
    const { data: contacts } = await sb.from('contacts').select('id, name, phone').ilike('phone', `%${normPhone}%`).limit(50)
    let dealId: number | null = null
    let contactName: string | null = null
    if(contacts && contacts.length>0){
      const contactIds = contacts.map((c:any)=>c.id)
      const { data: links } = await sb.from('deal_contacts').select('deal_id, contact_id').in('contact_id', contactIds)
      if(links && links.length>0){ dealId = links[0].deal_id; const c = contacts.find((c:any)=>c.id === links[0].contact_id); contactName = c?.name || null }
    }

    // call EVA to classify
    let classification: any = { milestone: null }
    try{ classification = await callEva(text) }catch(e){ classification = { milestone: null, error: String(e) } }

    // canonical map for AI milestone -> checklist key
    const CANONICAL_MAP: Record<string,string> = {
      appraisal_received: 'appraisal',
      clear_to_close: 'clear_to_close',
      inspection_complete: 'inspection',
      appraisal: 'appraisal',
      clear_to_close_notice: 'clear_to_close'
    }

    // if milestone identified, update deal checklist using canonical mapping
    if(classification && classification.milestone && dealId){
      try{
        const mapped = CANONICAL_MAP[String(classification.milestone)] || String(classification.milestone)
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/deal-checklist`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dealId, key: mapped, status: 'done' }) })
        // post a ticker event
        try{ await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/deal-ticker/add`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ transactionId: dealId, event_type: 'milestone', message: `Milestone: ${mapped}`, metadata: { source: 'ghl-inbound-sms', ai: classification } }) }) }catch(e){ console.warn('ticker post failed', e) }
      }catch(e){ console.warn('deal-checklist update failed', e) }
    }

    // audit: log raw reply + AI classification
    try{
      const now = new Date().toISOString()
      const auditPayload:any = { deal_id: dealId || null, message: `Inbound SMS from ${phone}: ${text}`, metadata: { ai: classification }, created_at: now, recipient: contactName || phone }
      await sb.from('deal_activity_log').insert(auditPayload)
    }catch(e){ console.warn('audit log failed', e) }

    return NextResponse.json({ ok:true, dealId, classification })
  }catch(e:any){ console.error('inbound-sms error', e); return NextResponse.json({ error: String(e?.message||e) }, { status: 500 }) }
}
