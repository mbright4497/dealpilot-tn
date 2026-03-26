import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { computeLifecycleState, validateLifecycleIntegrity } from '@/lib/deal-lifecycle'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { dealId: string } }){
  const dealId = parseInt(params.dealId, 10)
  if (isNaN(dealId)) return NextResponse.json({ error: 'Invalid deal_id' }, { status: 400 })

  const { data, error } = await getSupabase().from('deal_state').select('*').eq('deal_id', dealId).single()
  if (error || !data) return NextResponse.json({ error: 'Deal state not found', details: error?.message }, { status: 404 })

  const row = data as any
  const current_state = computeLifecycleState(row)
  const integrity = validateLifecycleIntegrity(row)

  // Rule: closed deals are always healthy — check FIRST before any penalty rules
  if (current_state === 'closed' || (row.status && row.status.toLowerCase() === 'closed')) {
    return NextResponse.json({ status: 'healthy', score: 100, signals: ['Deal closed successfully'] })
  }

  // Rule 1: integrity override
  if (integrity && integrity.valid === false) {
    const first = (integrity.errors && integrity.errors.length>0) ? integrity.errors[0] : 'Integrity issue'
    return NextResponse.json({ status: 'at_risk', score: 30, signals: [{ label: first, impact: 'high' }] })
  }

  // Rule 3: draft
  if (current_state === 'draft') {
    return NextResponse.json({ status: 'attention', score: 60, signals: [{ label: 'Contract not yet bound', impact: 'medium' }] })
  }

  // Phase 16 Risk Intelligence Engine
  let score = 100
  let signals: string[] = []
  const today = new Date()
  const deal: any = row

  // 1 Deadline Risk - if deadlines available
  const deadlines: any[] | undefined = (row.deadlines || undefined)
  if (deadlines && Array.isArray(deadlines) && deadlines.length > 0) {
    deadlines.forEach(d => {
      if (!d || !d.date) return
      const diffDays = Math.ceil((new Date(d.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) {
        score -= 25
        signals.push(`Missed deadline: ${d.title}`)
      } else if (diffDays <= 2) {
        score -= 10
        signals.push(`Urgent deadline approaching: ${d.title}`)
      }
    })
  }

  // 2 Missing Critical Dates
  if (!deal.binding && !deal.binding_date) {
    score -= 15
    signals.push('Missing binding date')
  }
  if (!deal.closing && !deal.closing_date) {
    score -= 10
    signals.push('Missing closing date')
  }

  // 3 Lifecycle Integrity - skip if integrity object not numeric
  if (typeof integrity === 'number') {
    if (integrity < 70) {
      score -= 15
      signals.push('Lifecycle integrity below threshold')
    }
  } else if (integrity && integrity.valid === false) {
    // previously handled above, but in case
    score -= 15
    signals.push('Lifecycle integrity issues')
  }

  // 4 Checklist Completion
  const checklistProgress = (row.checklist_progress != null) ? Number(row.checklist_progress) : undefined
  if (typeof checklistProgress === 'number' && checklistProgress < 60) {
    score -= 10
    signals.push('Checklist under 60% complete')
  }

  if (deal.status === 'Closed' || current_state === 'closed') {
    score = 100
    signals = ['Deal closed successfully']
  }

  if (score < 0) score = 0

  let status: 'healthy' | 'attention' | 'at_risk'
  if (deal.status === 'Closed' || current_state === 'closed') {
    status = 'healthy'
  } else if (score >= 80) {
    status = 'healthy'
  } else if (score >= 55) {
    status = 'attention'
  } else {
    status = 'at_risk'
  }

  return NextResponse.json({ score, status, signals })
}
