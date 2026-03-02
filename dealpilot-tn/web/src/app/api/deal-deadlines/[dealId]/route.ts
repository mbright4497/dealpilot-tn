import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDays } from '@/lib/business-days'
import { computeLifecycleState } from '@/lib/deal-lifecycle'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

function deadlineStatus(deadlineDate: string, lifecycleState: string): 'completed' | 'upcoming' | 'overdue' | 'today' {
  const today = new Date().toISOString().split('T')[0]
  if (deadlineDate === today) return 'today'
  if (deadlineDate < today) {
    if (lifecycleState === 'closed') return 'completed'
    return 'overdue'
  }
  return 'upcoming'
}

function daysRemaining(deadlineDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(deadlineDate)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET(req: Request, { params }: { params: { dealId: string } }) {
  const dealId = parseInt(params.dealId, 10)
  if (isNaN(dealId)) return NextResponse.json({ error: 'Invalid deal_id' }, { status: 400 })

  const { data, error } = await supabase.from('deal_state').select('*').eq('deal_id', dealId).single()
  if (error || !data) return NextResponse.json({ error: 'Deal not found', details: error?.message }, { status: 404 })

  const row = data as any
  const state = computeLifecycleState(row)

  if (!row.binding_date) {
    return NextResponse.json({ deal_id: dealId, state, deadlines: [], message: 'No binding date - deadlines cannot be computed' })
  }

  const binding = new Date(row.binding_date)
  const deadlines: any[] = []

  const ddDate = addDays(binding, 10).toISOString().split('T')[0]
  deadlines.push({ key: 'due_diligence', label: 'Due Diligence Deadline', date: ddDate, status: deadlineStatus(ddDate, state), days_remaining: daysRemaining(ddDate) })

  const appraisalDate = addDays(binding, 15).toISOString().split('T')[0]
  deadlines.push({ key: 'appraisal', label: 'Appraisal Deadline', date: appraisalDate, status: deadlineStatus(appraisalDate, state), days_remaining: daysRemaining(appraisalDate) })

  const titleDate = addDays(binding, 20).toISOString().split('T')[0]
  deadlines.push({ key: 'title_search', label: 'Title Search Deadline', date: titleDate, status: deadlineStatus(titleDate, state), days_remaining: daysRemaining(titleDate) })

  if (row.closing_date) {
<<<<<<< HEAD
    const closingD = new Date(row.closing_date)
    const fwD = new Date(closingD)
    fwD.setDate(fwD.getDate() - 1)
    const fwDate = fwD.toISOString().split('T')[0]
=======
    const fwDate = addDays(new Date(row.closing_date), -1).toISOString().split('T')[0]
>>>>>>> c41904e (wip: ensure working tree clean before rebase)
    deadlines.push({ key: 'final_walkthrough', label: 'Final Walkthrough', date: fwDate, status: deadlineStatus(fwDate, state), days_remaining: daysRemaining(fwDate) })

    const clDate = row.closing_date
    deadlines.push({ key: 'closing', label: 'Closing Day', date: clDate, status: deadlineStatus(clDate, state), days_remaining: daysRemaining(clDate) })
  }

  return NextResponse.json({ deal_id: dealId, state, deadlines })
}
