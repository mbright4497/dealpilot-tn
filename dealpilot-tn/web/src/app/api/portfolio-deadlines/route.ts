import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { addDays } from '@/lib/business-days'
import { computeLifecycleState } from '@/lib/deal-lifecycle'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}

export const dynamic = 'force-dynamic'

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
  deadlines.push({ key: 'due_diligence', label: 'Due Diligence', date: ddDate, status: deadlineStatus(ddDate, state), days_remaining: daysRemaining(ddDate), deal_id: row.deal_id, address: row.address || 'Unknown', client: row.client || null })

  const appraisalDate = addDays(binding, 15).toISOString().split('T')[0]
  deadlines.push({ key: 'appraisal', label: 'Appraisal', date: appraisalDate, status: deadlineStatus(appraisalDate, state), days_remaining: daysRemaining(appraisalDate), deal_id: row.deal_id, address: row.address || 'Unknown', client: row.client || null })

  const titleDate = addDays(binding, 20).toISOString().split('T')[0]
  deadlines.push({ key: 'title_search', label: 'Title Search', date: titleDate, status: deadlineStatus(titleDate, state), days_remaining: daysRemaining(titleDate), deal_id: row.deal_id, address: row.address || 'Unknown', client: row.client || null })

  if (row.closing_date) {
    const closingD = new Date(row.closing_date)
    const fwD = new Date(closingD)
    fwD.setDate(fwD.getDate() - 1)
    const fwDate = fwD.toISOString().split('T')[0]
    deadlines.push({ key: 'final_walkthrough', label: 'Final Walkthrough', date: fwDate, status: deadlineStatus(fwDate, state), days_remaining: daysRemaining(fwDate), deal_id: row.deal_id, address: row.address || 'Unknown', client: row.client || null })

    deadlines.push({ key: 'closing', label: 'Closing Day', date: row.closing_date, status: deadlineStatus(row.closing_date, state), days_remaining: daysRemaining(row.closing_date), deal_id: row.deal_id, address: row.address || 'Unknown', client: row.client || null })
  }
  return deadlines
}

export async function GET() {
  const { data, error } = await getSupabase().from('deal_state').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Normalize and enrich deal_state rows with transaction address/client when missing
  const dealIds = (data || []).map((r: any) => r.deal_id ?? r.id)
  const { data: txns } = await getSupabase().from('transactions').select('id,address,client').in('id', dealIds)
  const txMap = new Map((txns || []).map((t: any) => [t.id, t]))

  const enriched = (data || []).map((r: any) => {
    const id = r.deal_id ?? r.id
    const tx = txMap.get(id)
    return {
      ...r,
      deal_id: id,
      address: r.address || (tx && tx.address) || null,
      client: r.client || (tx && tx.client) || null,
    }
  })

  // Exclude closed deals and ghost transactions (no address AND no client)
  const filteredEnriched = (enriched || []).filter((row: any) => {
    const state = computeLifecycleState(row)
    if (state === 'closed') return false
    const hasAddress = row.address && String(row.address).trim()
    const hasClient = row.client && String(row.client).trim()
    return !!(hasAddress || hasClient)
  })

  const allDeadlines = (filteredEnriched || []).flatMap((row: any) => computeDeadlines(row))
  allDeadlines.sort((a, b) => a.date.localeCompare(b.date))

  const today = new Date().toISOString().split('T')[0]
  const next7 = new Date()
  next7.setDate(next7.getDate() + 7)
  const next7Str = next7.toISOString().split('T')[0]

  const overdue = allDeadlines.filter(d => d.status === 'overdue')
  const todayItems = allDeadlines.filter(d => d.status === 'today')
  const upcoming = allDeadlines.filter(d => d.status === 'upcoming')
  const next7Days = allDeadlines.filter(d => d.date >= today && d.date <= next7Str && d.status !== 'completed')

  // Backward-compatible response plus `items` and `generatedAt`
  const items = allDeadlines.map((d: any) => ({
    dealId: String(d.deal_id),
    address: d.address,
    client: d.client || null,
    dealStatus: d.status,
    deadlineKey: d.key,
    deadlineName: d.label,
    dueDate: d.date
  }))

  return NextResponse.json({
    total_upcoming: upcoming.length,
    overdue_count: overdue.length,
    today_count: todayItems.length,
    next_7_days: next7Days,
    all_deadlines: allDeadlines,
    items,
    generatedAt: new Date().toISOString()
  })
}
