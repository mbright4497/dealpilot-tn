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

function computeDeadlines(row: any) {
  const state = computeLifecycleState(row)
  if (!row.binding_date) return []
  const binding = new Date(row.binding_date)
  const deadlines: any[] = []

  const ddDate = addDays(binding, 10).toISOString().split('T')[0]
  deadlines.push({ key: 'due_diligence', label: 'Due Diligence', date: ddDate, status: deadlineStatus(ddDate, state), days_remaining: daysRemaining(ddDate), deal_id: row.deal_id, address: row.address || 'Unknown' })

  const appraisalDate = addDays(binding, 15).toISOString().split('T')[0]
  deadlines.push({ key: 'appraisal', label: 'Appraisal', date: appraisalDate, status: deadlineStatus(appraisalDate, state), days_remaining: daysRemaining(appraisalDate), deal_id: row.deal_id, address: row.address || 'Unknown' })

  const titleDate = addDays(binding, 20).toISOString().split('T')[0]
  deadlines.push({ key: 'title_search', label: 'Title Search', date: titleDate, status: deadlineStatus(titleDate, state), days_remaining: daysRemaining(titleDate), deal_id: row.deal_id, address: row.address || 'Unknown' })

  if (row.closing_date) {
    const closingD = new Date(row.closing_date)
    const fwD = new Date(closingD)
    fwD.setDate(fwD.getDate() - 1)
    const fwDate = fwD.toISOString().split('T')[0]
    deadlines.push({ key: 'final_walkthrough', label: 'Final Walkthrough', date: fwDate, status: deadlineStatus(fwDate, state), days_remaining: daysRemaining(fwDate), deal_id: row.deal_id, address: row.address || 'Unknown' })

    deadlines.push({ key: 'closing', label: 'Closing Day', date: row.closing_date, status: deadlineStatus(row.closing_date, state), days_remaining: daysRemaining(row.closing_date), deal_id: row.deal_id, address: row.address || 'Unknown' })
  }
  return deadlines
}

export async function GET() {
  const { data, error } = await supabase.from('deal_state').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const allDeadlines = (data || []).flatMap(row => computeDeadlines(row))
  allDeadlines.sort((a, b) => a.date.localeCompare(b.date))

  const today = new Date().toISOString().split('T')[0]
  const next7 = new Date()
  next7.setDate(next7.getDate() + 7)
  const next7Str = next7.toISOString().split('T')[0]

  const overdue = allDeadlines.filter(d => d.status === 'overdue')
  const todayItems = allDeadlines.filter(d => d.status === 'today')
  const upcoming = allDeadlines.filter(d => d.status === 'upcoming')
  const next7Days = allDeadlines.filter(d => d.date >= today && d.date <= next7Str && d.status !== 'completed')

  return NextResponse.json({
    total_upcoming: upcoming.length,
    overdue_count: overdue.length,
    today_count: todayItems.length,
    next_7_days: next7Days,
    all_deadlines: allDeadlines
  })
}
