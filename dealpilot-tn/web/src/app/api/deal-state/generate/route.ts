import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )
}

export const dynamic = 'force-dynamic'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase()
    const { deal_id } = await req.json()
    if (!deal_id) {
      return NextResponse.json(
        { error: 'deal_id required' },
        { status: 400 }
      )
    }

    // Pull extracted contract data
    const { data: contract, error: cErr } = await supabase
      .from('contract_store')
      .select('extracted')
      .eq('deal_id', String(deal_id))
      .single()

    if (cErr || !contract?.extracted) {
      return NextResponse.json(
        { error: 'No extracted contract data found', details: cErr?.message },
        { status: 404 }
      )
    }

    const ex = contract.extracted

    const bindingDate = ex.binding_agreement_date || null
    const closingDate = ex.closing_date || null
    const possessionDate = ex.possession_date || null
    const inspectionDays = ex.inspection_period_days || null

    let inspectionEndDate: string | null = null
    if (bindingDate && inspectionDays) {
      inspectionEndDate = addDays(bindingDate, inspectionDays)
    }

    let earnestMoneyDueDate: string | null = null
    if (bindingDate) {
      earnestMoneyDueDate = addDays(bindingDate, 3)
    }

    const dealState = {
      deal_id: deal_id,
      binding_date: bindingDate,
      purchase_price: ex.sale_price || 0,
      earnest_money_amount: ex.earnest_money || 0,
      earnest_money_due_date: earnestMoneyDueDate,
      financing_type: ex.loan_type || null,
      inspection_period_days: inspectionDays,
      inspection_end_date: inspectionEndDate,
      appraisal_contingency: ex.appraisal_contingent ?? false,
      closing_date: closingDate,
      possession_date: possessionDate,
      current_state: 'binding',
    }

    // Upsert
    const { data: existing } = await supabase
      .from('deal_state')
      .select('id')
      .eq('deal_id', deal_id)
      .single()

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('deal_state')
        .update({ ...dealState, updated_at: new Date().toISOString() })
        .eq('deal_id', deal_id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      result = data
    } else {
      const { data, error } = await supabase
        .from('deal_state')
        .insert(dealState)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      result = data
    }

    return NextResponse.json({
      deal_id: result.deal_id,
      binding_date: result.binding_date,
      purchase_price: result.purchase_price,
      earnest_money: {
        amount: result.earnest_money_amount,
        due_date: result.earnest_money_due_date,
      },
      financing: {
        type: result.financing_type,
      },
      inspection_period_days: result.inspection_period_days,
      inspection_end_date: result.inspection_end_date,
      appraisal_contingency: result.appraisal_contingency,
      closing_date: result.closing_date,
      possession_date: result.possession_date,
      current_state: result.current_state,
    })
  } catch (e: any) {
    console.error('deal-state generate error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
