import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function S(answers: Record<string, unknown>, id: string): string {
  const v = answers[id]
  return v != null ? String(v) : ''
}

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

  const loanTypeStr = answers.loan_type != null ? String(answers.loan_type).toLowerCase() : ''
  if (loanTypeStr === 'cash') {
    updates.financing_contingency_waived = true
  }

  const rf401Wizard: Record<string, unknown> = {
    deed_book: S(answers, 'rf401_7'),
    deed_page: S(answers, 'rf401_8'),
    instrument_number: S(answers, 'rf401_9'),
    further_legal_description: S(answers, 'rf401_10'),
    garage_remotes:
      answers.rf401_11 != null && String(answers.rf401_11).trim() !== ''
        ? String(answers.rf401_11).trim()
        : '2',
    buyer_declines_leased_assumption: answers.rf401_15 === 'true',
    leased_item_to_cancel: S(answers, 'rf401_16'),
    purchase_price_words: S(answers, 'rf401_18'),
    possession:
      answers.rf401_37 === 'Temporary occupancy agreement'
        ? 'temporary_occupancy'
        : 'at_closing',
    items_remaining: S(answers, 'items_remaining'),
    items_not_remaining: S(answers, 'items_not_remaining'),
    property_address: S(answers, 'property_address'),
    exhibits_addenda: S(answers, 'exhibits_addenda'),
    offer_exp_time: S(answers, 'offer_exp_time'),
    offer_exp_date: S(answers, 'offer_exp_date'),
    proof_of_funds: S(answers, 'proof_of_funds'),
    title_expenses: S(answers, 'title_expenses'),
    expense_modifications: S(answers, 'expense_modifications'),
    earnest_money_payment_method: S(answers, 'earnest_money_payment_method'),
    earnest_money_other_method: S(answers, 'earnest_money_other_method'),
    greenbelt_status: S(answers, 'greenbelt_status'),
    waive_repair_request: S(answers, 'waive_repair_request'),
    waive_all_inspections: S(answers, 'waive_all_inspections'),
    hpp_paid_by: S(answers, 'hpp_paid_by'),
    hpp_amount: S(answers, 'hpp_amount'),
    hpp_provider: S(answers, 'hpp_provider'),
    hpp_ordered_by: S(answers, 'hpp_ordered_by'),
    home_warranty: S(answers, 'home_warranty'),
    appraisal_contingent: S(answers, 'appraisal_contingent'),
    buyer_2_name: S(answers, 'buyer_2_name'),
    seller_2_name: S(answers, 'seller_2_name'),
    buyer1_offer_date: S(answers, 'buyer1_offer_date'),
    buyer1_offer_time: S(answers, 'buyer1_offer_time'),
    buyer1_offer_ampm: S(answers, 'buyer1_offer_ampm'),
    buyer2_offer_date: S(answers, 'buyer2_offer_date'),
    buyer2_offer_time: S(answers, 'buyer2_offer_time'),
    buyer2_offer_ampm: S(answers, 'buyer2_offer_ampm'),
    seller_response: S(answers, 'seller_response'),
    seller1_date: S(answers, 'seller1_date'),
    seller1_time: S(answers, 'seller1_time'),
    seller1_ampm: S(answers, 'seller1_ampm'),
    seller2_date: S(answers, 'seller2_date'),
    seller2_time: S(answers, 'seller2_time'),
    seller2_ampm: S(answers, 'seller2_ampm'),
    binding_acknowledged_by: S(answers, 'binding_acknowledged_by'),
    binding_agreement_date: S(answers, 'binding_agreement_date'),
    binding_agreement_time: S(answers, 'binding_agreement_time'),
    binding_agreement_ampm: S(answers, 'binding_agreement_ampm'),
    listing_firm_name: S(answers, 'listing_firm_name'),
    listing_firm_address: S(answers, 'listing_firm_address'),
    listing_firm_license: S(answers, 'listing_firm_license'),
    listing_firm_phone: S(answers, 'listing_firm_phone'),
    listing_licensee_name: S(answers, 'listing_licensee_name'),
    listing_licensee_number: S(answers, 'listing_licensee_number'),
    listing_licensee_email: S(answers, 'listing_licensee_email'),
    listing_licensee_cell: S(answers, 'listing_licensee_cell'),
    buying_firm_name: S(answers, 'buying_firm_name'),
    buying_firm_address: S(answers, 'buying_firm_address'),
    buying_firm_license: S(answers, 'buying_firm_license'),
    buying_firm_phone: S(answers, 'buying_firm_phone'),
    buying_licensee_name: S(answers, 'buying_licensee_name'),
    buying_licensee_number: S(answers, 'buying_licensee_number'),
    buying_licensee_email: S(answers, 'buying_licensee_email'),
    buying_licensee_cell: S(answers, 'buying_licensee_cell'),
    hoa_name: S(answers, 'hoa_name'),
    hoa_phone: S(answers, 'hoa_phone'),
    hoa_email: S(answers, 'hoa_email'),
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
  if (answers.appraisal_contingent != null && String(answers.appraisal_contingent) !== '') {
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
