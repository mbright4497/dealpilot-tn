export type TransactionDocumentType =
  | 'rf401_psa'
  | 'rf406_counter'
  | 'rf407_amendment'
  | 'fha_addendum'
  | 'va_addendum'
  | 'lead_paint'
  | 'property_condition'
  | 'rf621_buyer_rep'
  | 'closing_disclosure'
  | 'settlement_statement'
  | 'inspection_report'
  | 'appraisal'
  | 'title_commitment'
  | 'other'

export const DOCUMENT_TYPE_OPTIONS: { value: TransactionDocumentType; label: string }[] = [
  { value: 'rf401_psa', label: 'Purchase & Sale Agreement (RF401)' },
  { value: 'rf406_counter', label: 'Counter Offer (RF406)' },
  { value: 'rf407_amendment', label: 'Amendment (RF407)' },
  { value: 'fha_addendum', label: 'FHA Addendum' },
  { value: 'va_addendum', label: 'VA Addendum' },
  { value: 'lead_paint', label: 'Lead Paint Disclosure' },
  { value: 'property_condition', label: 'Property Condition Disclosure' },
  { value: 'rf621_buyer_rep', label: 'Buyer Rep Agreement (RF621)' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'appraisal', label: 'Appraisal Report' },
  { value: 'title_commitment', label: 'Title Commitment' },
  { value: 'closing_disclosure', label: 'Closing Disclosure' },
  { value: 'settlement_statement', label: 'Settlement Statement' },
  { value: 'other', label: 'Other' },
]

export type DocumentPhase = 'pre_contract' | 'under_contract' | 'closing'

export function documentPhase(documentType: string): DocumentPhase {
  switch (documentType) {
    case 'rf621_buyer_rep':
    case 'property_condition':
      return 'pre_contract'
    case 'closing_disclosure':
    case 'settlement_statement':
    case 'appraisal':
    case 'title_commitment':
      return 'closing'
    default:
      return 'under_contract'
  }
}

export function isTransactionDocumentType(s: string): s is TransactionDocumentType {
  return DOCUMENT_TYPE_OPTIONS.some((o) => o.value === s)
}
