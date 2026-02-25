import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function verifySignature(secret: string, body: string, sig: string){
  const h = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig))
}

export async function POST(req: Request){
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!)
  const raw = await req.text()
  const sig = req.headers.get('x-ghl-signature') || ''
  const secret = process.env.GHL_WEBHOOK_SECRET || ''
  if(!verifySignature(secret, raw, sig)) return NextResponse.json({ error:'invalid_signature' }, { status:401 })

  const payload = JSON.parse(raw)
  if(payload.event !== 'opportunity.updated' && payload.event !== 'opportunity.created'){
    return NextResponse.json({ ok:true })
  }

  const opp = payload.data || {}
  const title = opp.title || opp.name || 'Opportunity'
  const contact_name = opp.contact?.name || opp.contact_name || null
  const binding = opp.binding_agreement_date || opp.bindingAgreementDate || null

  const { data: deal } = await supabase.from('deals').insert({ title, contact_name, status: 'draft' }).select().single()

  await supabase.from('deal_activity_log').insert({ deal_id: deal.id, message: `GHL webhook processed: ${payload.event}` })

  if(binding){
    // trigger deadline generation
    await supabase.rpc('generate_deadlines_for_deal', { p_deal_id: deal.id, p_binding_date: binding })
  }

  return NextResponse.json({ ok:true, deal })
}
