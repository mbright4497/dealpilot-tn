import { NextResponse } from 'next/server'
import { getSupabaseSafe } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseSafe()

    // Query communication_log for last communication per transaction
    const { data, error } = await supabase
      .from('communication_log')
      .select('transaction_id, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error fetching comms:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reduce to last comm per transaction
    const lastByTx: Record<string, string> = {}
    for (const row of data as any[]) {
      const tx = String(row.transaction_id)
      if (!lastByTx[tx]) lastByTx[tx] = row.created_at
    }

    const now = new Date()
    const result = Object.entries(lastByTx).map(([transaction_id, created_at]) => {
      const last = new Date(created_at)
      const diffMs = now.getTime() - last.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      return {
        transaction_id,
        last_comm: created_at,
        days_since: Math.floor(diffDays),
        overdue: diffDays >= 3
      }
    })

    return NextResponse.json({ result })
  } catch (err: any) {
    console.error('GET /api/transactions/comms-badge error', err)
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 })
  }
}
