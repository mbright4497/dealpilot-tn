import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request){
  try{
    const body = await req.json()
    const { dealId, extracted } = body
    if(!dealId || !extracted) return NextResponse.json({ error: 'missing params' }, { status:400 })

    const supabase = createServerSupabaseClient()

    // build txUpdates similar to server mapping
    const txUpdates:any = {}
    txUpdates.binding = extracted.binding_agreement_date || extracted.binding_agreement || extracted.binding || extracted.contract_date || extracted.contractDate || null
    txUpdates.closing = extracted.closing_date || extracted.closingDate || extracted.closing || null
    txUpdates.purchase_price = extracted.purchase_price || extracted.sale_price || extracted.price || null
    txUpdates.earnest_money = extracted.earnest_money || null
    txUpdates.seller_names = Array.isArray(extracted.seller_names) ? extracted.seller_names.join(', ') : (extracted.seller_name || null)
    txUpdates.buyer_names = Array.isArray(extracted.buyer_names) ? extracted.buyer_names.join(', ') : (extracted.buyer_name || null)
    txUpdates.contacts = Array.isArray(extracted.parties) ? extracted.parties : (Array.isArray(extracted.contacts) ? extracted.contacts : [])
    txUpdates.value = extracted.purchase_price != null ? String(extracted.purchase_price) : (extracted.sale_price != null ? String(extracted.sale_price) : (extracted.price != null ? String(extracted.price) : null))

    // update transactions row by id
    await supabase.from('transactions').update(txUpdates).eq('id', Number(dealId))

    // upsert transaction_parties/transaction_terms to mirror older app tables
    if(Array.isArray(extracted.parties) && extracted.parties.length){
      // clear existing
      await supabase.from('transaction_parties').delete().eq('transaction_id', dealId as any)
      const toInsert = extracted.parties.map((p:any)=>({ transaction_id: dealId, role: p.role, name: p.name, email: p.email || null, phone: p.phone || null }))
      if(toInsert.length) await supabase.from('transaction_parties').insert(toInsert)
    }

    // also insert/update transaction_terms if relevant
    const terms:any = {}
    if(extracted.purchase_price) terms.purchase_price = extracted.purchase_price
    if(extracted.earnest_money) terms.earnest_money = extracted.earnest_money
    if(Object.keys(terms).length) await supabase.from('transaction_terms').upsert({ transaction_id: dealId, ...terms }, { conflict: 'transaction_id' })

    return NextResponse.json({ ok: true })
  }catch(err:any){
    return NextResponse.json({ error: err.message||String(err) }, { status:500 })
  }
}
