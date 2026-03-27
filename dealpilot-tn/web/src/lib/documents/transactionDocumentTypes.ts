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
  | 'working_with_pro'
  | 'disclaimer_notice'
  | 'wire_fraud_warning'
  | 'written_agreement_tour'
  | 'confirmation_agency'
  | 'subsurface_sewage'
  | 'repair_amendment'
  | 'final_walkthrough'
  | 'property_condition_update'
  | 'closing_date_amendment'
  | 'termite_letter'
  | 'temp_occupancy'
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
  { value: 'working_with_pro', label: 'Working with a Real Estate Professional' },
  { value: 'disclaimer_notice', label: 'Disclaimer Notice' },
  { value: 'wire_fraud_warning', label: 'Wire Fraud Warning' },
  { value: 'written_agreement_tour', label: 'Written Agreement Before Touring' },
  { value: 'confirmation_agency', label: 'Confirmation of Agency (RF302)' },
  { value: 'subsurface_sewage', label: 'Subsurface Sewage Disposal Disclosure' },
  { value: 'repair_amendment', label: 'Repair / Replacement Amendment' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'appraisal', label: 'Appraisal Report' },
  { value: 'title_commitment', label: 'Title Commitment' },
  { value: 'final_walkthrough', label: 'Buyer Final Walkthrough' },
  { value: 'property_condition_update', label: 'Property Condition Update' },
  { value: 'closing_disclosure', label: 'Closing Disclosure' },
  { value: 'settlement_statement', label: 'Settlement Statement' },
  { value: 'closing_date_amendment', label: 'Closing Date Amendment' },
  { value: 'termite_letter', label: 'Termite / WDI Inspection Letter' },
  { value: 'temp_occupancy', label: 'Temporary Occupancy Agreement' },
  { value: 'other', label: 'Other' },
]

export type DocumentPhase = 'pre_contract' | 'under_contract' | 'closing'

export function documentPhase(documentType: string): DocumentPhase {
  switch (documentType) {
    case 'rf621_buyer_rep':
    case 'working_with_pro':
    case 'disclaimer_notice':
    case 'wire_fraud_warning':
    case 'written_agreement_tour':
      return 'pre_contract'
    case 'closing_disclosure':
    case 'settlement_statement':
    case 'appraisal':
    case 'title_commitment':
    case 'final_walkthrough':
    case 'property_condition_update':
    case 'closing_date_amendment':
    case 'termite_letter':
    case 'temp_occupancy':
      return 'closing'
    default:
      return 'under_contract'
  }
}

export function isTransactionDocumentType(s: string): s is TransactionDocumentType {
  return DOCUMENT_TYPE_OPTIONS.some((o) => o.value === s)
}
