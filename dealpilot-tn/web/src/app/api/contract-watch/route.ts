import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // 1) get pending milestones
    const { data: milestones, error: mErr } = await supabase
      .from('deal_milestones')
      .select('*')
      .neq('status', 'completed')
      .order('due_date', { ascending: true })

    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

    // 2) get transactions (id -> address)
    const { data: transactions, error: tErr } = await supabase
      .from('transactions')
      .select('id, address')

    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })

    const txMap: Record<number|string, string> = {}
    for (const t of transactions || []) {
      txMap[t.id] = t.address || 'Unknown Address'
    }

    // manual join
    const now = new Date()
    const grouped: Record<string, any> = {}

    for (const m of milestones || []) {
      const dealId = m.deal_id
      const addr = txMap[dealId] || 'Unknown Address'

      const dueDate = m.due_date ? new Date(m.due_date) : null
      const daysRemaining = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / 86400000) : null

      // Filter out milestones too far in the past (e.g., >30 days past)
      if (daysRemaining !== null && daysRemaining < -30) continue

      if (!grouped[addr]) grouped[addr] = { address: addr, milestones: [] }
      grouped[addr].milestones.push({ label: m.label, dueDate: m.due_date, daysRemaining, status: m.status })
    }

    const results = Object.values(grouped).map((g: any) => ({
      address: g.address,
      milestones: (g.milestones || []).sort((a: any, b: any) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
    }))

    // sort by soonest milestone across groups
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
