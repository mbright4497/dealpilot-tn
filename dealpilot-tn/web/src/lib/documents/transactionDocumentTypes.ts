export type TransactionDocumentType =
  | 'rf401_psa'
  | 'rf406_counter'
  | 'rf407_amendment'
  | 'fha_addendum'
  | 'va_addendum'
  | 'lead_paint'
  | 'lead_paint_pamphlet'
  | 'property_condition'
  | 'property_condition_update'
  | 'rf621_buyer_rep'
  | 'buyer_rep_amendment'
  | 'closing_disclosure'
  | 'settlement_statement'
  | 'inspection_report'
  | 'inspection_importance'
  | 'septic_importance'
  | 'appraisal'
  | 'title_commitment'
  | 'working_with_pro'
  | 'disclaimer_notice'
  | 'wire_fraud_warning'
  | 'written_agreement_tour'
  | 'binder_receipt'
  | 'binder_request'
  | 'compensation_agreement'
  | 'addendum'
  | 'confirmation_agency'
  | 'agency_change_notice'
  | 'subsurface_sewage'
  | 'personal_interest'
  | 'water_waste'
  | 'repair_proposal'
  | 'repair_amendment'
  | 'buyer_repair_auth'
  | 'notification'
  | 'fsbo_agreement'
  | 'termination_notice'
  | 'mutual_release'
  | 'final_walkthrough'
  | 'closing_date_amendment'
  | 'escrow_agreement'
  | 'termite_letter'
  | 'temp_occupancy_buyer'
  | 'temp_occupancy_seller'
  | 'referral_agreement'
  | 'referring_w9'
  | 'home_inspection_report'
  | 'appraisal_report'
  | 'survey'
  | 'hoa_documents'
  | 'septic_report'
  | 'well_water_test'
  | 'termite_wdi_report'
  | 'deed'
  | 'plat_map'
  | 'radon_report'
  | 'utility_bills'
  | 'warranty_documents'
  | 'photos'
  | 'other'

export const DOCUMENT_TYPE_OPTIONS: { value: TransactionDocumentType; label: string }[] = [
  { value: 'home_inspection_report', label: 'Home Inspection Report' },
  { value: 'appraisal_report', label: 'Appraisal Report' },
  { value: 'survey', label: 'Survey' },
  { value: 'hoa_documents', label: 'HOA Documents' },
  { value: 'septic_report', label: 'Septic / Soil Report' },
  { value: 'well_water_test', label: 'Well / Water Test Report' },
  { value: 'termite_wdi_report', label: 'Termite / WDI Inspection Report' },
  { value: 'deed', label: 'Deed' },
  { value: 'plat_map', label: 'Plat Map' },
  { value: 'radon_report', label: 'Radon Test Report' },
  { value: 'utility_bills', label: 'Utility Bills' },
  { value: 'warranty_documents', label: 'Home Warranty Documents' },
  { value: 'photos', label: 'Property Photos' },
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
    case 'buyer_rep_amendment':
      return 'pre_contract'
    case 'closing_disclosure':
    case 'settlement_statement':
    case 'appraisal':
    case 'title_commitment':
    case 'final_walkthrough':
    case 'property_condition_update':
    case 'closing_date_amendment':
    case 'escrow_agreement':
    case 'termite_letter':
    case 'temp_occupancy_buyer':
    case 'temp_occupancy_seller':
    case 'referral_agreement':
    case 'referring_w9':
      return 'closing'
    default:
      return 'under_contract'
  }
}

export function isTransactionDocumentType(s: string): s is TransactionDocumentType {
  return DOCUMENT_TYPE_OPTIONS.some((o) => o.value === s)
}
