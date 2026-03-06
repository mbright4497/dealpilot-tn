import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST() {
  try {
    const ids = [6, 8]

    // Delete from deal_state
    const { data: delDealState, error: delDsErr } = await supabase.from('deal_state').delete().in('id', ids)
    if (delDsErr) return NextResponse.json({ error: delDsErr.message }, { status: 500 })
    const deletedDealStateIds = Array.isArray(delDealState) ? delDealState.map((r:any) => r.id) : []

    // Delete from transactions
    const { data: delTx, error: delTxErr } = await supabase.from('transactions').delete().in('id', ids)
    if (delTxErr) return NextResponse.json({ error: delTxErr.message }, { status: 500 })
    const deletedTxIds = Array.isArray(delTx) ? delTx.map((r:any) => r.id) : []

    return NextResponse.json({ deleted_deal_state: deletedDealStateIds, deleted_transactions: deletedTxIds })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
