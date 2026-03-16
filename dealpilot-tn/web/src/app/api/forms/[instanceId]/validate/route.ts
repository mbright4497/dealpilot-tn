import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import FORM_REGISTRY from '@/lib/forms/form-registry'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { instanceId: string } }){
  try{
    const supabase = createServerSupabaseClient()
    const { data } = await supabase.from('form_instances').select('*').eq('id', params.instanceId).single()
    if(!data) return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
    const formDef = FORM_REGISTRY[data.form_id]
    if(!formDef) return NextResponse.json({ error: 'Unknown form' }, { status: 404 })
    // basic validation example: check required fields
    const fieldData = data.field_data || {}
    const missing: string[] = []
    for(const f of formDef.fields){ if(f.required && (fieldData[f.fieldKey] === undefined || fieldData[f.fieldKey] === null || fieldData[f.fieldKey] === '')) missing.push(f.fieldKey) }
    const report = { missing_fields: missing, ok: missing.length===0 }
    // persist validation_state
    await supabase.from('form_instances').update({ validation_state: report, updated_at: new Date().toISOString() }).eq('id', params.instanceId)
    return NextResponse.json(report)
  }catch(err:any){ return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
