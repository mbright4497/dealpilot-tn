import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST() {
  try {
    // Step 1: select candidate ids (avoid referencing address column directly)
    const { data: candidates, error: selErr } = await supabase
      .from('deal_state')
      .select('id,client,binding_date')
      .is('binding_date', null)

    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 })

    const dealIds = (candidates || []).map((r: any) => r.id)
    // fetch transaction addresses to check if address exists on transaction
    const { data: txns } = await supabase.from('transactions').select('id,address').in('id', dealIds)
    const txMap = new Map((txns || []).map((t: any) => [t.id, t]))

    const ghosts = (candidates || []).filter((r: any) => {
      const tx = txMap.get(r.id)
      const addrEmpty = !(r as any).address && (!tx || !tx.address)
      const clientEmpty = !r.client || r.client === ''
      const bindingNull = r.binding_date === null
      return addrEmpty && clientEmpty && bindingNull
    })

    if (!ghosts.length) return NextResponse.json({ deleted: 0 })

    const ids = ghosts.map((g: any) => g.id)
    const { data, error } = await supabase.from('deal_state').delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const deletedCount = Array.isArray(data) ? data.length : ids.length
    return NextResponse.json({ deleted: deletedCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
