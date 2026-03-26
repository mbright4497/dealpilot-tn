import type { TransactionDocumentType } from '@/lib/documents/transactionDocumentTypes'

export type DealImpact = {
  price_change?: number | null
  previous_purchase_price?: number | null
  new_purchase_price?: number | null
  closing_date_change?: string | null
  possession_date_change?: string | null
  earnest_money_change?: number | null
  new_conditions?: string[]
  notes?: string
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** Derive structured deal_impact from document type + extracted JSON. */
export function computeDealImpact(
  documentType: TransactionDocumentType | string,
  extracted: unknown
): DealImpact {
  const impact: DealImpact = {}
  const e = asRecord(extracted)
  if (!e) {
    impact.notes = 'No structured extraction available.'
    return impact
  }

  switch (documentType) {
    case 'rf406_counter': {
      const price = e.new_purchase_price
      if (typeof price === 'number' && Number.isFinite(price)) {
        impact.new_purchase_price = price
        impact.price_change = price
      }
      const close = e.new_closing_date
      if (typeof close === 'string' && close.trim()) impact.closing_date_change = close.trim()
      const em = e.new_earnest_money
      if (typeof em === 'number' && Number.isFinite(em)) impact.earnest_money_change = em
      const terms = e.additional_terms
      if (Array.isArray(terms)) {
        impact.new_conditions = terms.map((t) => String(t)).filter(Boolean)
      }
      break
    }
    case 'rf407_amendment': {
      const nc = e.new_closing_date
      if (typeof nc === 'string' && nc.trim()) impact.closing_date_change = nc.trim()
      const np = e.new_possession_date
      if (typeof np === 'string' && np.trim()) impact.possession_date_change = np.trim()
      const rc = e.repair_credit
      if (typeof rc === 'number' && Number.isFinite(rc)) {
        impact.new_conditions = [`Repair credit: $${rc}`]
      }
      const repairs = e.repair_items
      if (Array.isArray(repairs) && repairs.length) {
        const r = repairs.map((x) => String(x)).filter(Boolean)
        impact.new_conditions = [...(impact.new_conditions || []), ...r]
      }
      const other = e.other_changes
      if (Array.isArray(other)) {
        impact.new_conditions = [...(impact.new_conditions || []), ...other.map((x) => String(x))]
      }
      break
    }
    case 'fha_addendum':
    case 'va_addendum': {
      const add: string[] = []
      const mpr = e.minimum_property_requirements
      if (Array.isArray(mpr)) add.push(...mpr.map((x) => String(x)))
      const ac = e.additional_conditions
      if (Array.isArray(ac)) add.push(...ac.map((x) => String(x)))
      if (e.escape_clause === true) add.push('Escape clause present')
      if (e.amendatory_clause === true) add.push('Amendatory clause present')
      if (add.length) impact.new_conditions = add
      break
    }
    case 'rf401_psa': {
      const fields = asRecord(e.fields) || e
      const p = fields.purchasePrice
      if (typeof p === 'number' && Number.isFinite(p)) {
        impact.new_purchase_price = p
      }
      const cd = fields.closingDate
      if (typeof cd === 'string' && cd.trim()) impact.closing_date_change = cd.trim()
      break
    }
    default:
      impact.notes = 'Tracked for reference; apply manual review for deal terms.'
  }

  return impact
}
