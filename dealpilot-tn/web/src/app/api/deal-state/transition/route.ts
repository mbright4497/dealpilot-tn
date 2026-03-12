export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const PHASE_MAP: Record<string,string> = {
  'Draft': 'draft',
  'Under Contract': 'binding',
  'Due Diligence': 'inspection_period',
  'Post-Inspection': 'post_inspection',
  'Closing Prep': 'post_inspection',
  'Closed': 'closed'
}

export async function POST(req: Request){
  try{
    const body = await req.json()
    const { dealId, to_phase, triggered_by } = body
    if(!dealId || !to_phase) return NextResponse.json({ error: 'missing params' }, { status:400 })
    if(!PHASE_MAP[to_phase]) return NextResponse.json({ error: 'invalid phase' }, { status:400 })

    const supabase = createServerSupabaseClient({ request: req as any, response: undefined as any })

    // fetch existing deal_state (or compute fallback)
    const { data: existing } = await supabase.from('deal_state').select('*').eq('deal_id', Number(dealId)).single().catch(()=>({ data: null }))
    const from_phase = existing?.current_state || null
    const new_internal = PHASE_MAP[to_phase]

    // upsert deal_state
    const payload:any = { deal_id: Number(dealId), current_state: new_internal, updated_at: new Date().toISOString() }
    await supabase.from('deal_state').upsert(payload, { onConflict: 'deal_id' })

    // insert into phase_transitions
    await supabase.from('phase_transitions').insert([{ transaction_id: Number(dealId), from_phase: from_phase, to_phase: to_phase, triggered_by: triggered_by || 'web', metadata: { internal_state: new_internal } }])

    return NextResponse.json({ ok: true, from: from_phase, to: to_phase })
  }catch(err:any){
    return NextResponse.json({ error: err.message||String(err) }, { status:500 })
  }
}
