import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: Request){
  try{
    const body = await req.json()
    const { fields, timeline } = body
    const supabase = createServerSupabaseClient()

    const address = fields?.propertyAddress || ''
    const buyers = fields?.buyerNames || null
    const sellers = fields?.sellerNames || null
    const purchasePrice = fields?.purchasePrice ? Number(fields.purchasePrice) : null
    const bindingDate = fields?.bindingDate || null
    const inspectionEndDate = fields?.inspectionEndDate || null
    const closingDate = fields?.closingDate || null

    // Upsert transaction by address
    const { data: existing, error: sErr } = await supabase.from('transactions').select('id').eq('address', address).limit(1).maybeSingle()
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

    let transactionId = existing?.id
    if (!transactionId) {
      const { data: ins, error: iErr } = await supabase.from('transactions').insert({ address, buyer_names: buyers, seller_names: sellers, purchase_price: purchasePrice, closing_date: closingDate }).select('id').single()
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })
      transactionId = ins.id
    } else {
      // update existing
      await supabase.from('transactions').update({ buyer_names: buyers, seller_names: sellers, purchase_price: purchasePrice, closing_date: closingDate }).eq('id', transactionId)
    }

    // Upsert deal_state for this transaction (by deal_id)
    const { data: ds } = await supabase.from('deal_state').select('deal_id').eq('deal_id', transactionId).limit(1).maybeSingle()
    if (ds && ds.deal_id) {
      await supabase.from('deal_state').update({ binding_date: bindingDate, inspection_end_date: inspectionEndDate, closing_date: closingDate }).eq('deal_id', transactionId)
    } else {
      await supabase.from('deal_state').insert({ deal_id: transactionId, binding_date: bindingDate, inspection_end_date: inspectionEndDate, closing_date: closingDate })
    }

    // Optionally insert timeline items into deal_milestones
    if (Array.isArray(timeline)){
      for (const item of timeline){
        try{
          await supabase.from('deal_milestones').insert({ deal_id: transactionId, milestone_key: item.key || null, label: item.label || null, due_date: item.dueDate || null, status: item.completedAt ? 'completed' : 'pending' })
        }catch(_){ }
      }
    }

    return NextResponse.json({ success: true, transactionId })
  }catch(e:any){
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
