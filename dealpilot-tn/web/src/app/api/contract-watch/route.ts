import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // join deal_state, deal_milestones, transactions
    const { data, error } = await supabase
      .from('deal_milestones')
      .select(`
        milestone_key,
        label,
        due_date,
        completed_at,
        status,
        deal_state:deal_state!inner(deal_id,binding_date,inspection_end_date,closing_date,current_state),
        transaction:transactions!inner(id,address,closing_date)
      `)
      .order('due_date', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // transform: group by transaction.address
    const map: Record<string, any> = {}
    const now = new Date()

    for (const row of data || []) {
      const tx = row.transaction
      const addr = tx?.address || 'Unknown Address'
      const due = row.due_date ? new Date(row.due_date) : null
      const completed = row.completed_at !== null
      const daysRemaining = due ? Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

      // Only include incomplete milestones with future or recent due dates (within 30 days past)
      if (completed) continue
      if (due) {
        const daysPast = Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
        if (daysRemaining < -30) continue
      }

      if (!map[addr]) map[addr] = { address: addr, milestones: [] }
      map[addr].milestones.push({ label: row.label, dueDate: row.due_date, daysRemaining, status: row.status })
    }

    // flatten and sort by soonest deadline
    const results = Object.values(map).map((g: any) => ({
      address: g.address,
      milestones: (g.milestones || []).sort((a: any, b: any) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
    }))

    results.sort((x: any, y: any) => {
      const ax = x.milestones[0]?.dueDate ? new Date(x.milestones[0].dueDate).getTime() : Infinity
      const by = y.milestones[0]?.dueDate ? new Date(y.milestones[0].dueDate).getTime() : Infinity
      return ax - by
    })

    return NextResponse.json({ results })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
