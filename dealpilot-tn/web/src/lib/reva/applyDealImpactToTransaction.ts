import { createClient } from '@supabase/supabase-js'
import type { DealImpact } from '@/lib/reva/dealImpact'

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function asStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function asNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[,$]/g, ''))
    if (Number.isFinite(n)) return n
  }
  return null
}

function asInt(v: unknown): number | null {
  const n = asNum(v)
  return n !== null ? Math.round(n) : null
}

function asBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === 'yes' || v === '1') return true
  if (v === 'false' || v === 'no' || v === '0') return false
  return null
}

function joinNames(v: unknown): string | null {
  if (Array.isArray(v) && v.length > 0) {
    const names = v.map((n) => String(n).trim()).filter(Boolean)
    return names.length > 0 ? names.join(' and ') : null
  }
  return asStr(v)
}

/** Merge deal_impact + PSA extraction into transactions row (contract_data JSONB + scalar columns). */
export async function applyDealImpactToTransaction(
  transactionId: number,
  documentType: string,
  dealImpact: DealImpact,
  extracted: unknown
): Promise<void> {
  console.log('APPLY_DEAL_IMPACT: service role key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY, 'url present:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data: tx, error } = await supabase
    .from('transactions')
    .select('id, contract_data, purchase_price, closing_date, earnest_money, binding_date, possession_date')
    .eq('id', transactionId)
    .maybeSingle()

  if (error || !tx) return

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  const contractData =
    tx.contract_data && typeof tx.contract_data === 'object'
      ? ({ ...(tx.contract_data as Record<string, unknown>) } as Record<string, unknown>)
      : {}

  // ── Counter-offer / Amendment ──────────────────────────────────────────────
  if (documentType === 'rf406_counter' || documentType === 'rf407_amendment') {
    if (dealImpact.new_purchase_price != null && typeof dealImpact.new_purchase_price === 'number') {
      updates.purchase_price = dealImpact.new_purchase_price
      contractData.purchase_price = dealImpact.new_purchase_price
    }
    if (dealImpact.closing_date_change) {
      updates.closing_date = dealImpact.closing_date_change
      contractData.closing_date = dealImpact.closing_date_change
    }
    if (dealImpact.possession_date_change) {
      updates.possession_date = dealImpact.possession_date_change
      contractData.possession_date = dealImpact.possession_date_change
    }
    if (dealImpact.earnest_money_change != null && typeof dealImpact.earnest_money_change === 'number') {
      updates.earnest_money = dealImpact.earnest_money_change
      contractData.earnest_money = dealImpact.earnest_money_change
    }
  }

  // ── RF401 Purchase & Sale Agreement ───────────────────────────────────────
  if (documentType === 'rf401_psa') {
    const root = asRecord(extracted)
    const fields = root ? asRecord(root.fields) : null

    if (fields) {
      // Store the full extracted fields snapshot in contract_data
      Object.assign(contractData, fields)

      // ── Section 1 – Property & Parties ────────────────────────────────────
      const buyerNamesStr = joinNames(fields.buyerNames)
      if (buyerNamesStr) updates.client = buyerNamesStr

      const sellerNamesStr = joinNames(fields.sellerNames)
      if (sellerNamesStr) updates.seller_name = sellerNamesStr

      const addr = asStr(fields.propertyAddress)
      if (addr) updates.address = addr

      const city = asStr(fields.city)
      if (city) {
        updates.city = city
        updates.property_city = city
      }

      const zip = asStr(fields.zip)
      if (zip) {
        updates.zip = zip
        updates.property_zip = zip
      }

      const county = asStr(fields.county)
      if (county) {
        updates.county = county
        updates.property_county = county
      }

      // ── Section 2 – Purchase Price & Financing ────────────────────────────
      const purchasePrice = asNum(fields.purchasePrice)
      if (purchasePrice !== null) {
        updates.purchase_price = purchasePrice
        contractData.purchase_price = purchasePrice
      }

      const loanType = asStr(fields.loanType)
      if (loanType) updates.loan_type = loanType

      const financingPercent = asNum(fields.financingPercent)
      if (financingPercent !== null) updates.loan_percentage = financingPercent

      const finContWaived = asBool(fields.financingContingencyWaived)
      if (finContWaived !== null) updates.financing_contingency_waived = finContWaived

      // appraisalContingency: "1"|"2" → true, "none" → false
      const appraisalVal = asStr(fields.appraisalContingency)
      if (appraisalVal !== null) {
        updates.appraisal_contingent = appraisalVal === '1' || appraisalVal === '2'
      }

      // ── Section 3 – Earnest Money ─────────────────────────────────────────
      const earnestMoney = asNum(fields.earnestMoney)
      if (earnestMoney !== null) {
        updates.earnest_money = earnestMoney
        contractData.earnest_money = earnestMoney
      }

      const earnestHolder = asStr(fields.earnestMoneyHolder)
      if (earnestHolder) updates.earnest_money_holder = earnestHolder

      const earnestDays = asInt(fields.earnestMoneyDueDays)
      if (earnestDays !== null) updates.earnest_money_days = earnestDays

      // ── Section 4 – Closing Date & Possession ─────────────────────────────
      const closingDate = asStr(fields.closingDate)
      if (closingDate) {
        updates.closing_date = closingDate
        contractData.closing_date = closingDate
      }

      // ── Section 4G – Closing Agencies ─────────────────────────────────────
      const buyerAgency = asStr(fields.buyerClosingAgency)
      if (buyerAgency) updates.closing_agency_buyer = buyerAgency

      const sellerAgency = asStr(fields.sellerClosingAgency)
      if (sellerAgency) updates.closing_agency_seller = sellerAgency

      // ── Section 5 – Title & Conveyance ────────────────────────────────────
      const deedNames = asStr(fields.deedNames)
      if (deedNames) updates.deed_names = deedNames

      // ── Section 6 – Lead Based Paint ──────────────────────────────────────
      const leadPaint = asBool(fields.leadBasedPaintApplies)
      if (leadPaint !== null) updates.lead_based_paint = leadPaint

      // ── Section 7 – Inspections ───────────────────────────────────────────
      const inspDays = asInt(fields.inspectionPeriodDays)
      if (inspDays !== null) updates.inspection_period_days = inspDays

      const resDays = asInt(fields.resolutionPeriodDays)
      if (resDays !== null) updates.resolution_period_days = resDays

      const finalInspDays = asInt(fields.finalInspectionDaysBefore)
      if (finalInspDays !== null) updates.final_inspection_days = finalInspDays

      // ── Section 8 – Home Protection Plan ─────────────────────────────────
      const hpp = asBool(fields.homeProtectionPlan)
      if (hpp !== null) updates.home_protection_plan = hpp ? 'yes' : 'no'

      // ── Section 17 – Binding Date (CRITICAL) ──────────────────────────────
      const bindingDate = asStr(fields.bindingDate)
      if (bindingDate) {
        updates.binding_date = bindingDate
        contractData.binding_date = bindingDate
      }

      // ── Derived: Inspection End Date = binding_date + inspection_period_days ──
      const effectiveBindingDate = bindingDate || asStr(tx.binding_date as unknown)
      const effectiveInspDays = inspDays ?? (tx.inspection_period_days as number | null)
      if (effectiveBindingDate && effectiveInspDays !== null && effectiveInspDays !== undefined) {
        const inspEnd = new Date(effectiveBindingDate)
        inspEnd.setDate(inspEnd.getDate() + effectiveInspDays)
        updates.inspection_end_date = inspEnd.toISOString().slice(0, 10)
      }

      // ── Section 21 – Special Stipulations ────────────────────────────────
      const stips = asStr(fields.specialStipulations)
      if (stips) updates.special_stipulations = stips

      // ── Signature Page – Firms & Licensees ───────────────────────────────
      const buyingFirm = asStr(fields.buyingFirm)
      if (buyingFirm) updates.buying_firm = buyingFirm

      const buyingLicensee = asStr(fields.buyingLicensee)
      if (buyingLicensee) updates.buying_agent = buyingLicensee

      const listingFirm = asStr(fields.listingFirm)
      if (listingFirm) updates.listing_firm = listingFirm

      const listingLicensee = asStr(fields.listingLicensee)
      if (listingLicensee) updates.listing_agent = listingLicensee

      // ── HOA/COA ───────────────────────────────────────────────────────────
      const hoaName = asStr(fields.hoaCoaPropertyManagementCompany)
      if (hoaName) updates.hoa_name = hoaName

      const hoaPhone = asStr(fields.hoaCoaPhone)
      if (hoaPhone) updates.hoa_phone = hoaPhone

      const hoaEmail = asStr(fields.hoaCoaEmail)
      if (hoaEmail) updates.hoa_email = hoaEmail
    }
  }

  if (Object.keys(contractData).length > 0) {
    updates.contract_data = contractData
  }

  const substantive = Object.keys(updates).filter((k) => k !== 'updated_at')
  if (substantive.length === 0) return

  console.log('APPLY_DEAL_IMPACT: writing fields', Object.keys(updates))
  const { error: updateError } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', transactionId)
  if (updateError) {
    console.error('APPLY_DEAL_IMPACT: update failed', updateError.message, updateError.details, updateError.hint)
  }
}
