import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: { id: string } }){
  const id = Number(params.id)
  if(isNaN(id)) return NextResponse.json({}, { status: 200 })
  try{
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('transactions').select('*').eq('id', id).maybeSingle()
    if(error) return NextResponse.json({}, { status: 200 })
    return NextResponse.json(data || {})
  }catch(e:any){ console.error('transactions/id error', e); return NextResponse.json({}, { status: 200 }) }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }){
  const id = Number(params.id)
  if(isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  try{
    const supabase = createServerSupabaseClient()
    await supabase.from('deal_state').delete().eq('deal_id', id)
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }catch(e:any){ console.error('DELETE /api/transactions/[id] error', e); return NextResponse.json({ error: e.message || 'Delete failed' }, { status: 500 }) }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }){
  const id = Number(params.id)
  if(isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  try{
    const body = await req.json()
    const fields = body.fields || body
    const supabase = createServerSupabaseClient()
    const update: any = {}
    if(fields.status !== undefined) update.status = fields.status
    if(fields.binding !== undefined){ update.binding_date = fields.binding; update.binding = fields.binding }
    if(fields.closing !== undefined){ update.closing_date = fields.closing; update.closing = fields.closing }
    if(fields.purchase_price !== undefined) update.purchase_price = fields.purchase_price
    if(fields.binding_date !== undefined) update.binding_date = fields.binding_date
    if(fields.closing_date !== undefined) update.closing_date = fields.closing_date
    const { data, error } = await supabase.from('transactions').update(update).eq('id', id).select().single()
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || {})
  }catch(e:any){ console.error('PATCH /api/transactions/[id] error', e); return NextResponse.json({ error: e.message || 'Update failed' }, { status: 500 }) }
}
