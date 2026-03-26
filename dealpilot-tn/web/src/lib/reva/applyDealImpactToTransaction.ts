import type { SupabaseClient } from '@supabase/supabase-js'
import type { DealImpact } from '@/lib/reva/dealImpact'

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** Merge deal_impact + PSA extraction into transactions row (contract_data JSONB + scalar columns). */
export async function applyDealImpactToTransaction(
  supabase: SupabaseClient,
  transactionId: number,
  documentType: string,
  dealImpact: DealImpact,
  extracted: unknown
): Promise<void> {
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

  if (documentType === 'rf401_psa') {
    const root = asRecord(extracted)
    const fields = root ? asRecord(root.fields) : null
    if (fields) {
      if (typeof fields.purchasePrice === 'number' && Number.isFinite(fields.purchasePrice)) {
        updates.purchase_price = fields.purchasePrice
        contractData.purchase_price = fields.purchasePrice
      }
      if (typeof fields.earnestMoney === 'number' && Number.isFinite(fields.earnestMoney)) {
        updates.earnest_money = fields.earnestMoney
        contractData.earnest_money = fields.earnestMoney
      }
      if (typeof fields.closingDate === 'string' && fields.closingDate.trim()) {
        updates.closing_date = fields.closingDate
        contractData.closing_date = fields.closingDate
      }
      if (typeof fields.bindingDate === 'string' && fields.bindingDate.trim()) {
        updates.binding_date = fields.bindingDate
        contractData.binding_date = fields.bindingDate
      }
    }
  }

  if (Object.keys(contractData).length > 0) {
    updates.contract_data = contractData
  }

  const substantive = Object.keys(updates).filter((k) => k !== 'updated_at')
  if (substantive.length === 0) return

  await supabase.from('transactions').update(updates).eq('id', transactionId)
}
