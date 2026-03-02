import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeLifecycleState, validateLifecycleIntegrity } from '@/lib/deal-lifecycle'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

function computeDealHealth(row: any): { status: string; score: number; signals: { label: string; impact: string }[] } {
  const current_state = computeLifecycleState(row)
  const integrity = validateLifecycleIntegrity(row)

  if (integrity && integrity.valid === false) {
    const first = (integrity.errors && integrity.errors.length > 0) ? integrity.errors[0] : 'Integrity issue'
    return { status: 'at_risk', score: 30, signals: [{ label: first, impact: 'high' }] }
  }
  if (current_state === 'closed') {
    return { status: 'healthy', score: 100, signals: [] }
  }
  if (current_state === 'draft') {
    return { status: 'attention', score: 60, signals: [{ label: 'Contract not yet bound', impact: 'medium' }] }
  }
  const signals: { label: string; impact: string }[] = []
  if (row.inspection_end_date) {
    const days = Math.ceil((new Date(row.inspection_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days >= 0 && days <= 2) {
      signals.push({ label: 'Inspection period ending soon', impact: 'medium' })
      return { status: 'attention', score: 65, signals }
    }
  }
  if (row.closing_date) {
    const days = Math.ceil((new Date(row.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days >= 0 && days <= 7) {
      signals.push({ label: 'Closing approaching', impact: 'medium' })
      return { status: 'attention', score: 70, signals }
    }
  }
  return { status: 'healthy', score: 90, signals }
}

export async function GET() {
  const { data, error } = await supabase.from('deal_state').select('*')
  if (error || !data) {
    return NextResponse.json({ error: 'Failed to fetch deals', details: error?.message }, { status: 500 })
  }

  const deals = data.map((row: any) => {
    const health = computeDealHealth(row)
    return {
      deal_id: row.deal_id,
      address: row.property_address || 'Unknown',
      buyer_name: row.buyer_name || '',
      seller_name: row.seller_name || '',
      ...health
    }
  })

  const totalScore = deals.length > 0 ? Math.round(deals.reduce((sum: number, d: any) => sum + d.score, 0) / deals.length) : 0
  const healthy = deals.filter((d: any) => d.status === 'healthy').length
  const attention = deals.filter((d: any) => d.status === 'attention').length
  const at_risk = deals.filter((d: any) => d.status === 'at_risk').length

  return NextResponse.json({
    portfolio_score: totalScore,
    total_deals: deals.length,
    summary: { healthy, attention, at_risk },
    deals
  })
}
