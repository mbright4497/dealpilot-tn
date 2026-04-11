import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transactionId = parseInt(params.transactionId, 10)
  if (isNaN(transactionId)) {
    return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 })
  }

  const { answers } = await req.json()
  if (!answers) return NextResponse.json({ error: 'No answers provided' }, { status: 400 })

  const updates: Record<string, unknown> = {}

  const textFields = [
    'property_city',
    'property_zip',
    'earnest_money_holder',
    'closing_agency_buyer',
    'closing_agency_seller',
    'special_stipulations',
    'items_remaining',
    'items_not_remaining',
    'home_warranty',
  ]

  for (const field of textFields) {
    if (answers[field] != null && answers[field] !== '') {
      updates[field] = answers[field]
    }
  }

  if (answers.rf401_6 != null && String(answers.rf401_6).trim() !== '') {
    updates.property_county = String(answers.rf401_6).trim()
  }
  if (answers.rf401_40 != null && String(answers.rf401_40).trim() !== '') {
    updates.deed_names = String(answers.rf401_40).trim()
  }

  const rf401Wizard: Record<string, unknown> = {
    deed_book: answers.rf401_7 != null ? String(answers.rf401_7) : '',
    deed_page: answers.rf401_8 != null ? String(answers.rf401_8) : '',
    instrument_number: answers.rf401_9 != null ? String(answers.rf401_9) : '',
    further_legal_description: answers.rf401_10 != null ? String(answers.rf401_10) : '',
    garage_remotes:
      answers.rf401_11 != null && String(answers.rf401_11).trim() !== ''
        ? String(answers.rf401_11).trim()
        : '2',
    buyer_declines_leased_assumption: answers.rf401_15 === 'true',
    leased_item_to_cancel: answers.rf401_16 != null ? String(answers.rf401_16) : '',
    purchase_price_words: answers.rf401_18 != null ? String(answers.rf401_18) : '',
    possession:
      answers.rf401_37 === 'Temporary occupancy agreement'
        ? 'temporary_occupancy'
        : 'at_closing',
  }
  updates.rf401_wizard = rf401Wizard

  if (answers.buyer_1_name) updates.client = answers.buyer_1_name
  if (answers.seller_1_name) updates.seller_name = answers.seller_1_name
  if (answers.property_address) updates.address = answers.property_address
  if (answers.purchase_price) {
    const n = parseFloat(String(answers.purchase_price).replace(/[^0-9.]/g, ''))
    if (!isNaN(n)) updates.purchase_price = n
  }
  if (answers.earnest_money) {
    const n = parseFloat(String(answers.earnest_money).replace(/[^0-9.]/g, ''))
    if (!isNaN(n)) updates.earnest_money = n
  }
  if (answers.earnest_money_days) {
    const n = parseInt(answers.earnest_money_days, 10)
    if (!isNaN(n)) updates.earnest_money_days = n
  }
  if (answers.loan_type) updates.loan_type = String(answers.loan_type).toLowerCase()
  if (answers.loan_percentage) {
    const n = parseFloat(answers.loan_percentage)
    if (!isNaN(n)) updates.loan_percentage = n
  }
  if (answers.closing_date) updates.closing_date = answers.closing_date
  if (answers.inspection_period_days) {
    const n = parseInt(answers.inspection_period_days, 10)
    if (!isNaN(n)) updates.inspection_period_days = n
  }
  if (answers.resolution_period_days) {
    const n = parseInt(answers.resolution_period_days, 10)
    if (!isNaN(n)) updates.resolution_period_days = n
  }
  if (answers.appraisal_contingent != null) {
    updates.appraisal_contingent = answers.appraisal_contingent === 'true'
  }
  if (answers.lead_based_paint != null) {
    updates.lead_based_paint = answers.lead_based_paint === 'true'
  }

  const { error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', transactionId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Wizard save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
