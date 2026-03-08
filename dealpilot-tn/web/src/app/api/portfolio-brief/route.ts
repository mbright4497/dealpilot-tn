export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET() {
  const { data: states, error: statesErr } = await supabase
    .from('deal_state')
    .select('deal_id')
    .neq('current_state', 'closed')

  if (statesErr) return NextResponse.json({ error: statesErr.message }, { status: 500 })

  const dealIds = (states || []).map((s: any) => s.deal_id || s.id).filter(Boolean)
  if (dealIds.length === 0) {
    return NextResponse.json({ summary: 'No active transactions today.' })
  }

  // Fetch transactions and only count those with a non-empty address or client
  const { data: txns, error: txErr } = await supabase.from('transactions').select('id,address,client').in('id', dealIds)
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })

  const filteredTxns = (txns || []).filter(t => (t.address && String(t.address).trim()) || (t.client && String(t.client).trim()))
  const activeCount = filteredTxns.length

  if (activeCount === 0) {
    return NextResponse.json({ summary: 'No active transactions today.' })
  }

  const summary = `You have ${activeCount} active transactions. Focus on inspection timelines and document completion. Stay ahead of deadlines today.`.trim()

  return NextResponse.json({ summary })
}
