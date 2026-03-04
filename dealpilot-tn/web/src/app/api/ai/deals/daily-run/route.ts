import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request){
  try{
    const { transaction_id, model='gpt-4o-mini' } = await req.json()
    if(!transaction_id) return NextResponse.json({ error: 'missing transaction_id' }, { status:400 })

    const sb = createServerSupabaseClient()
    const { data: deadlines } = await sb.from('deal_deadlines').select('*').eq('transaction_id', transaction_id)
    const { data: checklist } = await sb.from('deal_checklist_items').select('*').eq('transaction_id', transaction_id)

    const prompt = `You are EVA. Given deadlines: ${JSON.stringify(deadlines)} and checklist: ${JSON.stringify(checklist)}, produce a short action plan for today with recommended actions and status updates.`
    const apiKey = process.env.OPENAI_API_KEY
    if(!apiKey) return NextResponse.json({ error: 'missing OPENAI_API_KEY' }, { status:500 })

    const resp = await fetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers:{ 'Content-Type':'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages:[{ role:'user', content: prompt }], temperature:0.3 }) })
    const j = await resp.json()
    const reply = j?.choices?.[0]?.message?.content || ''

    // store run
    const summary = reply.slice(0, 4096)
    const actions_json = { raw: reply }
    await sb.from('eva_daily_runs').insert([{ transaction_id, summary, actions_json }])

    return NextResponse.json({ summary, actions_json })
  }catch(err:any){ return NextResponse.json({ error: err.message||String(err) }, { status:500 }) }
}
