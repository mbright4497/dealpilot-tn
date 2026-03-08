export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request){
  try{
    const body = await req.json()
    const { transaction_id, extraction_id } = body
    if(!transaction_id || !extraction_id) return NextResponse.json({ error: 'missing params' }, { status:400 })

    const supabase = createServerSupabaseClient()
    const { data: ex } = await supabase.from('document_extractions').select('*').eq('id', extraction_id).single()
    if(!ex) return NextResponse.json({ error: 'extraction not found' }, { status:404 })

    const extracted = ex.extraction_json || {}

    // map fields into transaction_terms
    const terms = {
      transaction_id,
      purchase_price: extracted.purchase_price || null,
      earnest_money: extracted.earnest_money || null,
      earnest_money_due_date: extracted.earnest_money_due_date || null,
      closing_date: extracted.closing_date || extracted.closing_date || null,
      binding_date: extracted.binding_date || null,
      inspection_deadline: extracted.inspection_deadline || null,
      appraisal_deadline: extracted.appraisal_deadline || null,
      financing_type: extracted.financing_type || null,
      special_stipulations: extracted.special_stipulations || null,
    }

    await supabase.from('transaction_terms').upsert(terms, { conflict: 'transaction_id' })

    // parties - replace existing for transaction
    if(Array.isArray(extracted.parties)){
      // clear existing
      await supabase.from('transaction_parties').delete().eq('transaction_id', transaction_id)
      const toInsert = extracted.parties.map((p:any)=>({ transaction_id, role: p.role, name: p.name, email: p.email, phone: p.phone }))
      if(toInsert.length) await supabase.from('transaction_parties').insert(toInsert)
    }

    // update transactions main fields
    const txUpdate:any = {}
    if(extracted.property_address) txUpdate.address = extracted.property_address
    if(extracted.purchase_price) txUpdate.price = extracted.purchase_price
    await supabase.from('transactions').update(txUpdate).eq('id', transaction_id)

    return NextResponse.json({ ok: true })
  }catch(err:any){ return NextResponse.json({ error: err.message||String(err) }, { status:500 }) }
}
