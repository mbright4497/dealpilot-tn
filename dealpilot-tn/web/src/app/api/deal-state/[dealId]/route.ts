import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: Request,
  { params }: { params: { dealId: string } }
) {
  const dealId = parseInt(params.dealId, 10)
  if (isNaN(dealId)) {
    return NextResponse.json({ error: 'Invalid deal_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('deal_state')
    .select('*')
    .eq('deal_id', dealId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Deal state not found', details: error?.message }, { status: 404 })
  }

  return NextResponse.json({
    deal_id: data.deal_id,
    binding_date: data.binding_date,
    purchase_price: data.purchase_price,
    earnest_money: {
      amount: data.earnest_money_amount,
      due_date: data.earnest_money_due_date,
    },
    financing: {
      type: data.financing_type,
      inspection_period_days: data.inspection_period_days,
      inspection_end_date: data.inspection_end_date,
    },
    appraisal_contingency: data.appraisal_contingency,
    closing_date: data.closing_date,
    possession_date: data.possession_date,
    current_state: data.current_state,
  })
}
