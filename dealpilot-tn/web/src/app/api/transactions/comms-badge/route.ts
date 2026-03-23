import { NextResponse } from 'next/server'
import { getSupabaseSafe } from '@/lib/supabase'

interface CommunicationLogRow {
  transaction_id: number | string
  created_at: string
}

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
    const rows = (data ?? []) as CommunicationLogRow[]
    for (const row of rows) {
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
  } catch (error) {
    console.error('GET /api/transactions/comms-badge error', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
