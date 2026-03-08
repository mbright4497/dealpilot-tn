export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request){
  try{
    const { transaction_id, model='gpt-4o-mini' } = await req.json()
    if(!transaction_id) return NextResponse.json({ error: 'missing transaction_id' }, { status:400 })

    const sb = createServerSupabaseClient()
    // fetch transaction_terms
    const { data: terms } = await sb.from('transaction_terms').select('*').eq('transaction_id', transaction_id).single()

    // build prompt
    const prompt = `Generate deadlines and checklist items for this Tennessee real estate transaction. Context: ${JSON.stringify(terms)}`
    const apiKey = process.env.OPENAI_API_KEY
    if(!apiKey) return NextResponse.json({ error: 'missing OPENAI_API_KEY' }, { status:500 })

    const resp = await fetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers:{ 'Content-Type':'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages:[{ role:'user', content: prompt }], temperature:0.2 }) })
    const j = await resp.json()
    const reply = j?.choices?.[0]?.message?.content || ''
    let parsed = null
    try{ parsed = JSON.parse(reply) }catch(e){ parsed = { raw: reply } }

    // parsed should have deadlines[] and checklist_items[]
    const deadlines = parsed.deadlines || []
    const items = parsed.checklist_items || []

    // insert deadlines
    for(const d of deadlines){
      await sb.from('deal_deadlines').insert([{ transaction_id, code: d.code, label: d.label, due_at: d.due_at, status: d.status||'upcoming', source: 'ai_inferred', confidence: d.confidence||null, notes: d.notes||null }])
    }
    for(const it of items){
      await sb.from('deal_checklist_items').insert([{ transaction_id, stage: it.stage, label: it.label, owner_role: it.owner_role||null, status: it.status||'todo', due_at: it.due_at||null, created_by: 'ai', meta: it.meta||null }])
    }

    return NextResponse.json({ ok:true, deadlinesCount: deadlines.length, itemsCount: items.length, parsed })
  }catch(err:any){ return NextResponse.json({ error: err.message||String(err) }, { status:500 }) }
}
