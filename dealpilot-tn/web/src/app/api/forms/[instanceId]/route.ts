import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { instanceId: string } }){
  try{
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('form_instances').select('*').eq('id', params.instanceId).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }catch(err:any){ return NextResponse.json({ error: String(err) }, { status: 500 }) }
}

export async function PUT(req: Request, { params }: { params: { instanceId: string } }){
  try{
    const body = await req.json()
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('form_instances').update({ field_data: body.field_data, current_step: body.current_step, updated_at: new Date().toISOString() }).eq('id', params.instanceId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }catch(err:any){ return NextResponse.json({ error: String(err) }, { status: 500 }) }
}

export async function DELETE(req: Request, { params }: { params: { instanceId: string } }){
  try{
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('form_instances').delete().eq('id', params.instanceId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }catch(err:any){ return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
