import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST() {
  try {
    const ids = [6, 8]

    // Delete from deal_state using select fallback
    let deletedDealStateIds: number[] = []
    try {
      const { data: ds, error: dsErr } = await supabase.from('deal_state').delete().in('id', ids).select('id')
      if (dsErr) throw dsErr
      deletedDealStateIds = Array.isArray(ds) ? ds.map((r:any) => r.id) : []
    } catch (e) {
      // continue; we'll try RPC as fallback for transactions below
    }

    // Check transactions existing rows first
    const { data: check, error: checkErr } = await supabase.from('transactions').select('id,address,client').in('id', ids)
    if (checkErr) return NextResponse.json({ error: checkErr.message }, { status: 500 })

    // Try RPC raw SQL for transactions delete
    let deletedTxIds: number[] = []
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('exec_sql', { sql: `DELETE FROM transactions WHERE id IN (${ids.join(',')}) RETURNING id` })
      if (rpcErr) throw rpcErr
      deletedTxIds = Array.isArray(rpcData) ? rpcData.map((r:any) => r.id) : []
    } catch (rpcErr) {
      // Fallback to delete().in().select('id')
      const { data: delTx, error: delTxErr } = await supabase.from('transactions').delete().in('id', ids).select('id')
      if (delTxErr) return NextResponse.json({ error: delTxErr.message }, { status: 500 })
      deletedTxIds = Array.isArray(delTx) ? delTx.map((r:any) => r.id) : []
    }

    return NextResponse.json({ check, deleted_deal_state: deletedDealStateIds, deleted_transactions: deletedTxIds })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
