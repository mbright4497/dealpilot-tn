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
  | 'other'

export const DOCUMENT_TYPE_OPTIONS: { value: TransactionDocumentType; label: string }[] = [
  { value: 'rf401_psa', label: 'Purchase & Sale Agreement (RF401)' },
  { value: 'rf406_counter', label: 'Counter Offer (RF406)' },
  { value: 'rf407_amendment', label: 'Amendment (RF407)' },
  { value: 'fha_addendum', label: 'FHA Addendum' },
  { value: 'va_addendum', label: 'VA Addendum' },
  { value: 'lead_paint', label: 'Lead Paint Disclosure' },
  { value: 'lead_paint_pamphlet', label: 'Protect Your Family from Lead Pamphlet' },
  { value: 'property_condition', label: 'Property Condition Disclosure' },
  { value: 'property_condition_update', label: 'Residential Property Condition Update' },
  { value: 'rf621_buyer_rep', label: 'Buyer Rep Agreement (RF621)' },
  { value: 'buyer_rep_amendment', label: 'Amendment to Buyer Representation Agreement' },
  { value: 'working_with_pro', label: 'Working with a Real Estate Professional' },
  { value: 'disclaimer_notice', label: 'Disclaimer Notice' },
  { value: 'wire_fraud_warning', label: 'Wire Fraud Warning' },
  { value: 'written_agreement_tour', label: 'Written Agreement Before Touring' },
  { value: 'binder_receipt', label: 'Binder / Trust Money Receipt' },
  { value: 'binder_request', label: 'Binder / Trust Money Request' },
  { value: 'compensation_agreement', label: 'Compensation Agreement' },
  { value: 'addendum', label: 'Addendum' },
  { value: 'confirmation_agency', label: 'Confirmation of Agency (RF302)' },
  { value: 'agency_change_notice', label: 'Notification of Change of Agency Status' },
  { value: 'subsurface_sewage', label: 'Subsurface Sewage Disposal Disclosure' },
  { value: 'inspection_importance', label: 'Importance of Getting a Home Inspection' },
  { value: 'septic_importance', label: 'Importance of a Property Septic Inspection' },
  { value: 'personal_interest', label: 'Personal Interest Disclosure and Consent' },
  { value: 'water_waste', label: 'Water Supply and Waste Disposal Notification' },
  { value: 'repair_proposal', label: 'Repair Proposal' },
  { value: 'repair_amendment', label: 'Repair / Replacement Amendment' },
  { value: 'buyer_repair_auth', label: 'Buyer Authorization for Pre-Closing Repairs' },
  { value: 'notification', label: 'Notification Form' },
  { value: 'fsbo_agreement', label: 'Agreement to Show Property (FSBO)' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'termination_notice', label: 'Notice of Termination of Contract' },
  { value: 'mutual_release', label: 'Mutual Release and Disbursement of Earnest Money' },
  { value: 'appraisal', label: 'Appraisal Report' },
  { value: 'title_commitment', label: 'Title Commitment' },
  { value: 'final_walkthrough', label: 'Buyer Final Walkthrough' },
  { value: 'closing_disclosure', label: 'Closing Disclosure' },
  { value: 'settlement_statement', label: 'Settlement Statement' },
  { value: 'closing_date_amendment', label: 'Closing Date Amendment' },
  { value: 'escrow_agreement', label: 'Escrow Agreement' },
  { value: 'termite_letter', label: 'Termite / WDI Inspection Letter' },
  { value: 'temp_occupancy_buyer', label: 'Temporary Occupancy Agreement - Buyer Before Closing' },
  { value: 'temp_occupancy_seller', label: 'Temporary Occupancy Agreement - Seller After Closing' },
  { value: 'referral_agreement', label: 'Referral Agreement' },
  { value: 'referring_w9', label: 'Referring Agent Brokerage W-9' },
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
