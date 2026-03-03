// TN Real Estate Form Schemas - RF401, RF403, RF404, RF421, RF651, RF625
// Complete field definitions mapped from actual TREC forms

export type FieldType = 'text'|'number'|'date'|'boolean'|'select'|'array'|'textarea'

export interface FormField {
  key: string
  label: string
  type: FieldType
  options?: string[]
  required?: boolean
  hint?: string
  section?: string
}

export interface FormSchema {
  id: string
  name: string
  description: string
  fields: FormField[]
    category?: string
  pages?: number
}

export const FORM_SCHEMAS: Record<string, FormSchema> = {
  rf401: {
    id: 'rf401',
    name: 'RF401 - Residential Purchase & Sale Agreement',
    description: 'Standard Tennessee residential purchase agreement for existing homes (10-page TREC form)',
    fields: [
      // === Section 1: Purchase and Sale (Parties & Property) ===
      { key: 'buyer_names', label: 'Buyer Name(s)', type: 'array', required: true, hint: 'Full legal names of all buyers', section: '1. Purchase and Sale' },
      { key: 'seller_names', label: 'Seller Name(s)', type: 'array', required: true, hint: 'Full legal names of all sellers', section: '1. Purchase and Sale' },
      { key: 'property_address', label: 'Property Address', type: 'text', required: true, section: '1. Purchase and Sale' },
      { key: 'property_city', label: 'City', type: 'text', required: true, section: '1. Purchase and Sale' },
      { key: 'property_zip', label: 'Zip Code', type: 'text', required: true, section: '1. Purchase and Sale' },
      { key: 'county', label: 'County', type: 'text', required: true, section: '1. Purchase and Sale' },
      { key: 'deed_book', label: 'Deed Book(s)', type: 'text', section: '1. Purchase and Sale' },
      { key: 'deed_page', label: 'Deed Page(s)', type: 'text', section: '1. Purchase and Sale' },
      { key: 'instrument_number', label: 'Instrument Number', type: 'text', section: '1. Purchase and Sale' },
      { key: 'legal_description', label: 'Legal Description', type: 'textarea', hint: 'Additional legal description if needed', section: '1. Purchase and Sale' },
      { key: 'garage_remotes_count', label: 'Number of Garage Remote Controls', type: 'number', hint: 'At least how many remotes', section: '1A. Included Items' },
      { key: 'other_items_remain', label: 'Other Items That Remain with Property', type: 'textarea', hint: 'Items beyond standard inclusions that stay', section: '1B. Other Items Remain' },
      { key: 'items_not_remaining', label: 'Items That Will NOT Remain', type: 'textarea', hint: 'Items seller is taking', section: '1C. Items Not Remaining' },
      { key: 'leased_items', label: 'Leased Items', type: 'textarea', hint: 'e.g. security systems, water softener, fuel tank', section: '1D. Leased Items' },
      { key: 'buyer_assumes_lease', label: 'Buyer Assumes Leased Items', type: 'boolean', section: '1D. Leased Items' },
      { key: 'lease_not_assumed', label: 'Leased Item Buyer Does NOT Wish to Assume', type: 'text', section: '1D. Leased Items' },
      // === Section 2: Purchase Price, Financing & Closing Expenses ===
      { key: 'sale_price', label: 'Purchase Price ($)', type: 'number', required: true, section: '2. Purchase Price' },
      { key: 'financing_contingency', label: 'Financing Contingency', type: 'select', options: ['Loan','Cash/Waived'], required: true, section: '2A. Financial Contingency' },
      { key: 'loan_percent', label: 'Loan Percentage of Purchase Price (%)', type: 'number', hint: 'e.g. 95 for 95% LTV', section: '2A. Financial Contingency' },
      { key: 'loan_type', label: 'Loan Type', type: 'select', options: ['Conventional','FHA','VA','USDA','Other'], section: '2A. Financial Contingency' },
      { key: 'loan_type_other', label: 'Other Loan Type Description', type: 'text', section: '2A. Financial Contingency' },
      { key: 'proof_of_funds_method', label: 'Proof of Funds Method (if cash)', type: 'text', hint: 'e.g. bank statement, commitment letter', section: '2B. Financing Waived' },
      { key: 'appraisal_contingency', label: 'Appraisal Contingency', type: 'select', options: ['Not Contingent','Contingent on Appraised Value'], required: true, section: '2C. Appraisal' },
      { key: 'title_expenses_paid_by', label: 'Title Expenses Paid By', type: 'text', hint: 'Who pays title search, mortgagee/owner policy', section: '2D. Closing Expenses' },
      { key: 'closing_expense_modifications', label: 'Closing Expense Modifications', type: 'textarea', section: '2D. Closing Expenses' },
      { key: 'buyer_closing_agency', label: "Buyer's Closing Agency", type: 'text', section: '2D. Closing Expenses' },
      { key: 'seller_closing_agency', label: "Seller's Closing Agency", type: 'text', section: '2D. Closing Expenses' },
      { key: 'seller_concessions', label: 'Seller Concessions ($)', type: 'number', section: '2D. Closing Expenses' },
      // === Section 3: Earnest Money/Trust Money ===
      { key: 'earnest_money', label: 'Earnest Money ($)', type: 'number', required: true, section: '3. Earnest Money' },
      { key: 'earnest_money_days', label: 'Days After BAD to Pay Earnest Money', type: 'number', section: '3. Earnest Money' },
      { key: 'earnest_money_holder', label: 'Earnest Money Holder Name', type: 'text', required: true, section: '3. Earnest Money' },
      { key: 'earnest_money_holder_address', label: 'Earnest Money Holder Address', type: 'text', section: '3. Earnest Money' },
      { key: 'earnest_money_method', label: 'Earnest Money Payment Method', type: 'text', hint: 'Check or other method', section: '3. Earnest Money' },
      // === Section 4: Closing, Prorations, Assessments ===
      { key: 'closing_date', label: 'Closing Date', type: 'date', required: true, section: '4A. Closing Date' },
      { key: 'possession_type', label: 'Possession Type', type: 'select', options: ['At Closing','Temporary Occupancy Agreement'], required: true, section: '4A. Possession' },
      { key: 'special_assessments', label: 'Special Assessments Terms', type: 'textarea', hint: 'Who pays special assessments if different from default', section: '4C. Special Assessments' },
      { key: 'hoa_name', label: 'HOA/COA Name', type: 'text', section: '4E. Association Fees' },
      { key: 'hoa_phone', label: 'HOA Phone', type: 'text', section: '4E. Association Fees' },
      { key: 'hoa_email', label: 'HOA Email', type: 'text', section: '4E. Association Fees' },
      { key: 'property_mgmt_company', label: 'Property Management Company', type: 'text', section: '4E. Association Fees' },
      // === Section 5: Title and Conveyance ===
      { key: 'deed_name', label: 'Name(s) on Deed', type: 'text', required: true, hint: 'Name(s) deed is to be made in', section: '5B. Deed' },
      // === Section 6: Lead-Based Paint ===
      { key: 'lead_based_paint', label: 'Lead-Based Paint Disclosure Applies', type: 'select', options: ['Does Not Apply','Applies (Pre-1978)'], section: '6. Lead-Based Paint' },
      // === Section 7: Inspections ===
      { key: 'inspection_period_days', label: 'Inspection Period (days after BAD)', type: 'number', required: true, hint: 'Number of days for inspections', section: '7D. Inspection Period' },
      { key: 'resolution_period_days', label: 'Resolution Period (days)', type: 'number', required: true, hint: 'Days after repair list to reach agreement', section: '7D. Resolution Period' },
      { key: 'wdi_exclusions', label: 'WDI Inspection Exclusions', type: 'text', hint: 'Structures excluded from wood destroying insect inspection', section: '7C. WDI Inspection' },
      { key: 'waive_all_inspections', label: 'Waive All Inspections', type: 'boolean', section: '7E. Waiver' },
      // === Section 8: Final Inspection ===
      { key: 'final_inspection_days', label: 'Final Inspection Days Before Closing', type: 'number', hint: 'Days prior to closing for final walkthrough', section: '8. Final Inspection' },
      // === Section 13: Home Protection Plan ===
      { key: 'home_warranty', label: 'Home Protection Plan', type: 'select', options: ['Include','Waived'], section: '13. Home Protection' },
      { key: 'home_warranty_paid_by', label: 'Home Warranty Paid By', type: 'text', hint: 'Buyer or Seller', section: '13. Home Protection' },
      { key: 'home_warranty_amount', label: 'Home Warranty Amount ($)', type: 'number', section: '13. Home Protection' },
      { key: 'home_warranty_provider', label: 'Home Warranty Plan Provider', type: 'text', section: '13. Home Protection' },
      { key: 'home_warranty_ordered_by', label: 'Warranty Ordered By (Company)', type: 'text', section: '13. Home Protection' },
      // === Section 17: Exhibits and Addenda ===
      { key: 'exhibits_addenda', label: 'Exhibits and Addenda Attached', type: 'textarea', hint: 'List all addenda, exhibits, disclosures attached', section: '17. Exhibits & Addenda' },
      // === Section 18: Special Stipulations ===
      { key: 'special_stipulations', label: 'Special Stipulations', type: 'textarea', hint: 'Custom terms that override preceding paragraphs', section: '18. Special Stipulations' },
      // === Section 19: Time Limit of Offer ===
      { key: 'offer_expiration_date', label: 'Offer Expiration Date', type: 'date', section: '19. Time Limit' },
      { key: 'offer_expiration_time', label: 'Offer Expiration Time', type: 'text', hint: 'e.g. 5:00 PM', section: '19. Time Limit' },
      { key: 'offer_expiration_ampm', label: 'AM/PM', type: 'select', options: ['AM','PM'], section: '19. Time Limit' },
      // === Signatures & Dates ===
      { key: 'buyer_offer_date', label: 'Buyer Offer Date', type: 'date', section: 'Signatures' },
      { key: 'seller_response', label: 'Seller Response', type: 'select', options: ['Accepts','Counters','Rejects'], section: 'Signatures' },
      { key: 'binding_agreement_date', label: 'Binding Agreement Date', type: 'date', section: 'Signatures' },
      // === Broker Information ===
      { key: 'listing_company', label: 'Listing Company', type: 'text', section: 'Broker Info' },
      { key: 'listing_company_address', label: 'Listing Firm Address', type: 'text', section: 'Broker Info' },
      { key: 'listing_firm_license', label: 'Listing Firm License No.', type: 'text', section: 'Broker Info' },
      { key: 'listing_firm_phone', label: 'Listing Firm Phone', type: 'text', section: 'Broker Info' },
      { key: 'listing_licensee', label: 'Listing Licensee Name', type: 'text', section: 'Broker Info' },
      { key: 'listing_licensee_number', label: 'Listing Licensee License No.', type: 'text', section: 'Broker Info' },
      { key: 'listing_licensee_email', label: 'Listing Licensee Email', type: 'text', section: 'Broker Info' },
      { key: 'selling_company', label: 'Selling Company', type: 'text', section: 'Broker Info' },
      { key: 'selling_company_address', label: 'Selling Firm Address', type: 'text', section: 'Broker Info' },
      { key: 'selling_firm_license', label: 'Selling Firm License No.', type: 'text', section: 'Broker Info' },
      { key: 'selling_firm_phone', label: 'Selling Firm Phone', type: 'text', section: 'Broker Info' },
      { key: 'selling_licensee', label: 'Selling Licensee Name', type: 'text', section: 'Broker Info' },
      { key: 'selling_licensee_number', label: 'Selling Licensee License No.', type: 'text', section: 'Broker Info' },
      { key: 'selling_licensee_email', label: 'Selling Licensee Email', type: 'text', section: 'Broker Info' },
    ]
  },
  // === RF403: New Construction ===
  rf403: {
    id: 'rf403',
    name: 'RF403 - New Construction Purchase & Sale Agreement',
    description: 'Tennessee purchase agreement for new construction homes',
    fields: [
      { key: 'buyer_names', label: 'Buyer Name(s)', type: 'array', required: true },
      { key: 'seller_builder_name', label: 'Seller/Builder Name', type: 'text', required: true },
      { key: 'property_address', label: 'Property Address / Lot', type: 'text', required: true },
      { key: 'subdivision', label: 'Subdivision Name', type: 'text' },
      { key: 'county', label: 'County', type: 'text', required: true },
      { key: 'sale_price', label: 'Sale Price ($)', type: 'number', required: true },
      { key: 'earnest_money', label: 'Earnest Money ($)', type: 'number', required: true },
      { key: 'loan_type', label: 'Loan Type', type: 'select', options: ['Conventional','FHA','VA','USDA','Cash','Other'] },
      { key: 'estimated_completion_date', label: 'Estimated Completion Date', type: 'date' },
      { key: 'closing_date', label: 'Closing Date', type: 'date', required: true },
      { key: 'square_footage', label: 'Approximate Square Footage', type: 'number' },
      { key: 'builder_warranty', label: 'Builder Warranty (years)', type: 'number' },
      { key: 'upgrades_allowance', label: 'Upgrades/Options Allowance ($)', type: 'number' },
      { key: 'seller_concessions', label: 'Seller Concessions ($)', type: 'number' },
      { key: 'binding_agreement_date', label: 'Binding Agreement Date', type: 'date' },
    ]
  },
  // === RF404: Lot/Land ===
  rf404: {
    id: 'rf404',
    name: 'RF404 - Lot / Land Purchase & Sale Agreement',
    description: 'Tennessee purchase agreement for vacant lots and land',
    fields: [
      { key: 'buyer_names', label: 'Buyer Name(s)', type: 'array', required: true },
      { key: 'seller_names', label: 'Seller Name(s)', type: 'array', required: true },
      { key: 'property_address', label: 'Property Address / Description', type: 'text', required: true },
      { key: 'county', label: 'County', type: 'text', required: true },
      { key: 'acreage', label: 'Acreage', type: 'number' },
      { key: 'tax_parcel_id', label: 'Tax Parcel ID', type: 'text' },
      { key: 'sale_price', label: 'Sale Price ($)', type: 'number', required: true },
      { key: 'earnest_money', label: 'Earnest Money ($)', type: 'number', required: true },
      { key: 'financing_type', label: 'Financing Type', type: 'select', options: ['Cash','Conventional','Owner Finance','Other'] },
      { key: 'due_diligence_days', label: 'Due Diligence Period (days)', type: 'number' },
      { key: 'closing_date', label: 'Closing Date', type: 'date', required: true },
      { key: 'utilities_available', label: 'Utilities Available', type: 'text', hint: 'e.g. electric, water, sewer, septic' },
      { key: 'perc_test_required', label: 'Perc Test Required', type: 'boolean' },
      { key: 'survey_required', label: 'Survey Required', type: 'boolean' },
      { key: 'binding_agreement_date', label: 'Binding Agreement Date', type: 'date' },
    ]
  },
  // === RF421: Residential Lease ===
  rf421: {
    id: 'rf421',
    name: 'RF421 - Residential Lease Agreement',
    description: 'Tennessee standard residential lease / rental agreement',
    fields: [
      { key: 'landlord_names', label: 'Landlord Name(s)', type: 'array', required: true },
      { key: 'tenant_names', label: 'Tenant Name(s)', type: 'array', required: true },
      { key: 'property_address', label: 'Rental Property Address', type: 'text', required: true },
      { key: 'county', label: 'County', type: 'text', required: true },
      { key: 'lease_start_date', label: 'Lease Start Date', type: 'date', required: true },
      { key: 'lease_end_date', label: 'Lease End Date', type: 'date', required: true },
      { key: 'monthly_rent', label: 'Monthly Rent ($)', type: 'number', required: true },
      { key: 'security_deposit', label: 'Security Deposit ($)', type: 'number', required: true },
      { key: 'pet_deposit', label: 'Pet Deposit ($)', type: 'number' },
      { key: 'pets_allowed', label: 'Pets Allowed', type: 'boolean' },
      { key: 'utilities_included', label: 'Utilities Included', type: 'text', hint: 'e.g. water, trash, lawn' },
      { key: 'late_fee', label: 'Late Fee ($)', type: 'number' },
      { key: 'grace_period_days', label: 'Grace Period (days)', type: 'number' },
      { key: 'smoking_allowed', label: 'Smoking Allowed', type: 'boolean' },
      { key: 'renewal_terms', label: 'Renewal Terms', type: 'text' },
    ]
  },
  // === RF651: Counter Offer ===
  rf651: {
    id: 'rf651',
    name: 'RF651 - Counter Offer',
    description: 'Tennessee counter offer addendum to modify original offer terms',
    fields: [
      { key: 'original_offer_date', label: 'Original Offer Date', type: 'date', required: true },
      { key: 'property_address', label: 'Property Address', type: 'text', required: true },
      { key: 'counter_offer_price', label: 'Counter Offer Price ($)', type: 'number' },
      { key: 'closing_date', label: 'New Closing Date', type: 'date' },
      { key: 'earnest_money', label: 'Earnest Money ($)', type: 'number' },
      { key: 'seller_concessions', label: 'Seller Concessions ($)', type: 'number' },
      { key: 'home_warranty', label: 'Home Warranty', type: 'boolean' },
      { key: 'home_warranty_amount', label: 'Home Warranty Amount ($)', type: 'number' },
      { key: 'possession_date', label: 'Possession Date', type: 'date' },
      { key: 'additional_terms', label: 'Additional/Modified Terms', type: 'textarea', hint: 'Any other modified terms' },
      { key: 'expiration_date', label: 'Counter Offer Expiration', type: 'date', required: true },
      { key: 'expiration_time', label: 'Expiration Time', type: 'text', hint: 'e.g. 5:00 PM EST' },
    ]
  },
  // === RF625: VA/FHA Amendatory Clause ===
  rf625: {
    id: 'rf625',
    name: 'RF625 - VA/FHA Amendatory Clause & Real Estate Certification',
    description: 'Required addendum for VA and FHA financed purchases in Tennessee',
    fields: [
      { key: 'buyer_names', label: 'Buyer Name(s)', type: 'array', required: true },
      { key: 'seller_names', label: 'Seller Name(s)', type: 'array', required: true },
      { key: 'property_address', label: 'Property Address', type: 'text', required: true },
      { key: 'county', label: 'County', type: 'text', required: true },
      { key: 'loan_type', label: 'Loan Type', type: 'select', options: ['VA','FHA'], required: true },
      { key: 'sale_price', label: 'Sale Price ($)', type: 'number', required: true },
      { key: 'appraised_value', label: 'Appraised Value ($)', type: 'number' },
      { key: 'lender_name', label: 'Lender Name', type: 'text' },
      { key: 'loan_amount', label: 'Loan Amount ($)', type: 'number' },
      { key: 'closing_date', label: 'Closing Date', type: 'date', required: true },
      { key: 'buyer_agent_name', label: "Buyer's Agent Name", type: 'text' },
      { key: 'listing_agent_name', label: 'Listing Agent Name', type: 'text' },
      { key: 'buyer_agent_company', label: "Buyer's Agent Company", type: 'text' },
      { key: 'listing_agent_company', label: 'Listing Agent Company', type: 'text' },
    ]
  }
}

export const FORM_LIST = Object.values(FORM_SCHEMAS)

export function getSchema(id: string): FormSchema | undefined {
    return FORM_SCHEMAS[id.toLowerCase()]
}
export const FORM_FIELDS: Record<string, any[]> = Object.fromEntries(
  FORM_LIST.map(f => [f.id, f.fields || []])
)

export function buildSystemPrompt(schema: FormSchema, filledFields: Record<string,unknown>): string {
  const missing = schema.fields
    .filter(f => f.required && !filledFields[f.key])
    .map(f => f.label + ' (' + (f.section || 'General') + ')')
  const filled = schema.fields
    .filter(f => filledFields[f.key])
    .map(f => f.label + ': ' + filledFields[f.key])
  const sections = [...new Set(schema.fields.map(f => f.section).filter(Boolean))]
  const progress = schema.fields.filter(f => f.required).length > 0
    ? Math.round((schema.fields.filter(f => f.required && filledFields[f.key]).length / schema.fields.filter(f => f.required).length) * 100)
    : 0

  const missingStr = missing.length
    ? 'Required fields still needed:\n' + missing.join('\n')
    : 'All required fields are filled!'

  const filledStr = filled.length ? filled.join('\n') : 'None yet'

  return [
    'You are DealPilot AI, a personal Transaction Coordinator assistant built for Tennessee real estate agents.',
    'You are filling out the ' + schema.name + '.',
    schema.description,
    '',
    'Form sections: ' + sections.join(', '),
    'Progress: ' + progress + '% complete',
    '',
    'Current filled fields:',
    filledStr,
    '',
    missingStr,
    '',
    'Behavior:',
    '- Walk through the form section by section in order',
    '- Ask for 2-3 related fields at a time conversationally',
    '- When the user provides info, confirm it and extract values as JSON (no code fences)',
    '- Use Tennessee real estate terminology (BAD, TREC, TCA 62, etc.)',
    '- Flag issues: seller concessions over 3% conventional, closing under 21 days, earnest money deadlines',
    '- When you spot something, say: Heads up - [issue]',
    '- After completing a section, celebrate: Nice - [section] is locked in.',
    '- When all required fields are collected, summarize and mention PDF download',
    '- You know TN law (Title 62, Title 66), TREC forms, MLS rules, agency disclosure',
    '- Be direct and professional, built for working agents, not consumers',
    '- Never provide legal advice, recommend attorney review for complex clauses',
    '- Format extracted fields as JSON like: {"field_key": "value"}',
  ].join('\n')
}
