import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { instanceId: string } }){
  try{
    const supabase = createServerSupabaseClient()
    const { data } = await supabase.from('form_instances').select('*').eq('id', params.instanceId).single()
    if(!data) return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
    // Return JSON export that client can transform to PDF/Docx later
    return NextResponse.json({ id: data.id, transaction_id: data.transaction_id, form_id: data.form_id, form_version: data.form_version, field_data: data.field_data, ai_fill_log: data.ai_fill_log, status: data.status })
  }catch(err:any){ return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
