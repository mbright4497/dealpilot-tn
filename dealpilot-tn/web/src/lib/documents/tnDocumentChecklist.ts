export type DocRequirement = 'required' | 'conditional' | 'optional'

export type DocPhase = 'pre_contract' | 'under_contract' | 'closing'

export interface TNDocumentSlot {
  id: string
  display_name: string
  document_type: string
  phase: DocPhase
  requirement: DocRequirement
  condition?: string
  reva_note?: string
}

export const TN_DOCUMENT_CHECKLIST: TNDocumentSlot[] = [
  {
    id: 'buyer_rep',
    display_name: 'Buyer Representation Agreement',
    document_type: 'rf621_buyer_rep',
    phase: 'pre_contract',
    requirement: 'required',
    reva_note: 'Check expiration date and agency type',
  },
  {
    id: 'working_with_pro',
    display_name: 'Working with a Real Estate Professional',
    document_type: 'working_with_pro',
    phase: 'pre_contract',
    requirement: 'required',
    reva_note: 'Verify buyer signature',
  },
  {
    id: 'disclaimer_notice',
    display_name: 'Disclaimer Notice',
    document_type: 'disclaimer_notice',
    phase: 'pre_contract',
    requirement: 'required',
    reva_note: 'Verify all parties signed',
  },
  {
    id: 'wire_fraud_pre',
    display_name: 'Wire Fraud Warning',
    document_type: 'wire_fraud_warning',
    phase: 'pre_contract',
    requirement: 'required',
    reva_note: 'Check buyer initials on warning section',
  },
  {
    id: 'written_agreement_tour',
    display_name: 'Written Agreement Before Touring',
    document_type: 'written_agreement_tour',
    phase: 'pre_contract',
    requirement: 'conditional',
    condition: 'Required if buyer toured homes before signing rep agreement',
    reva_note: 'Check tour dates align with agreement',
  },
  {
    id: 'rf401_psa',
    display_name: 'Purchase & Sale Agreement (RF401)',
    document_type: 'rf401_psa',
    phase: 'under_contract',
    requirement: 'required',
    reva_note: 'Full extraction: price, dates, contingencies, signatures',
  },
  {
    id: 'confirmation_agency',
    display_name: 'Confirmation of Agency (RF302)',
    document_type: 'confirmation_agency',
    phase: 'under_contract',
    requirement: 'required',
    reva_note: 'Verify all parties and agency type checked',
  },
  {
    id: 'property_condition',
    display_name: 'Property Condition Disclosure',
    document_type: 'property_condition',
    phase: 'under_contract',
    requirement: 'required',
    reva_note: 'Flag any YES answers in Section B or C',
  },
  {
    id: 'wire_fraud_contract',
    display_name: 'Wire Fraud Warning (Contract)',
    document_type: 'wire_fraud_warning',
    phase: 'under_contract',
    requirement: 'required',
    reva_note: 'Buyer AND seller initials required',
  },
  {
    id: 'fha_va_addendum',
    display_name: 'FHA / VA Addendum',
    document_type: 'fha_addendum',
    phase: 'under_contract',
    requirement: 'conditional',
    condition: 'Required when loan type is FHA or VA',
    reva_note: 'Check appraised value clause and escape clause',
  },
  {
    id: 'lead_paint',
    display_name: 'Lead Based Paint Disclosure',
    document_type: 'lead_paint',
    phase: 'under_contract',
    requirement: 'conditional',
    condition: 'Required if property built before 1978',
    reva_note: 'Check buyer acknowledgment',
  },
  {
    id: 'subsurface_sewage',
    display_name: 'Subsurface Sewage Disposal Disclosure',
    document_type: 'subsurface_sewage',
    phase: 'under_contract',
    requirement: 'conditional',
    condition: 'Required for properties with septic systems',
    reva_note: 'Verify permit number and bedroom count',
  },
  {
    id: 'counter_offer',
    display_name: 'Counter Offer (RF406)',
    document_type: 'rf406_counter',
    phase: 'under_contract',
    requirement: 'conditional',
    condition: 'Required if seller countered',
    reva_note: 'Check price changes applied to master deal',
  },
  {
    id: 'amendment',
    display_name: 'Amendment (RF407)',
    document_type: 'rf407_amendment',
    phase: 'under_contract',
    requirement: 'conditional',
    condition: 'Required if any terms were amended',
    reva_note: 'Apply changes to deal timeline',
  },
  {
    id: 'repair_amendment',
    display_name: 'Repair / Replacement Amendment',
    document_type: 'repair_amendment',
    phase: 'under_contract',
    requirement: 'conditional',
    condition: 'Required if inspection items were negotiated',
    reva_note: 'Check repair deadline and responsibility',
  },
  {
    id: 'inspection_report',
    display_name: 'Inspection Report',
    document_type: 'inspection_report',
    phase: 'under_contract',
    requirement: 'conditional',
    condition: 'Required if inspection was performed',
    reva_note: 'Flag major defects and safety items',
  },
  {
    id: 'final_walkthrough',
    display_name: 'Buyer Final Walkthrough',
    document_type: 'final_walkthrough',
    phase: 'closing',
    requirement: 'required',
    reva_note: 'Check date is within 2 days of closing',
  },
  {
    id: 'property_condition_update',
    display_name: 'Property Condition Update',
    document_type: 'property_condition_update',
    phase: 'closing',
    requirement: 'required',
    reva_note: 'Verify no new defects disclosed',
  },
  {
    id: 'closing_disclosure',
    display_name: 'Closing Disclosure (CD)',
    document_type: 'closing_disclosure',
    phase: 'closing',
    requirement: 'required',
    reva_note: 'Compare cash to close against PSA',
  },
  {
    id: 'settlement_statement',
    display_name: 'Settlement Statement (ALTA/HUD)',
    document_type: 'settlement_statement',
    phase: 'closing',
    requirement: 'required',
    reva_note: 'Verify seller proceeds and buyer costs',
  },
  {
    id: 'closing_date_amendment',
    display_name: 'Closing Date Amendment',
    document_type: 'closing_date_amendment',
    phase: 'closing',
    requirement: 'conditional',
    condition: 'Required if closing date was extended',
    reva_note: 'Verify new date matches all other docs',
  },
  {
    id: 'termite_letter',
    display_name: 'Termite / WDI Inspection Letter',
    document_type: 'termite_letter',
    phase: 'closing',
    requirement: 'conditional',
    condition: 'Required for FHA/VA loans',
    reva_note: 'Check clearance date is recent',
  },
  {
    id: 'temp_occupancy',
    display_name: 'Temporary Occupancy Agreement',
    document_type: 'temp_occupancy',
    phase: 'closing',
    requirement: 'conditional',
    condition: 'Required if buyer or seller needs early/late possession',
    reva_note: 'Check possession dates and daily rate',
  },
]

export function getSlotsByPhase(phase: DocPhase): TNDocumentSlot[] {
  return TN_DOCUMENT_CHECKLIST.filter((s) => s.phase === phase)
}

export function matchDocToSlot(document_type: string): TNDocumentSlot | undefined {
  return TN_DOCUMENT_CHECKLIST.find((s) => s.document_type === document_type)
}
