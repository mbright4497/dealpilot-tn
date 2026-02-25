// TN Real Estate Form Schemas - RF401, RF403, RF404, RF421, RF651, RF625
export type FieldType = 'text'|'number'|'date'|'boolean'|'select'|'array'

export interface FormField {
  key: string
  label: string
  type: FieldType
  options?: string[]
  required?: boolean
  hint?: string
}

export interface FormSchema {
  id: string
  name: string
  description: string
  fields: FormField[]
}

export const FORM_SCHEMAS: Record<string, FormSchema> = {
  rf401: {
    id: 'rf401',
    name: 'RF401 - Residential Purchase & Sale Agreement',
    description: 'Standard Tennessee residential purchase agreement for existing homes',
    fields: [
      { key: 'buyer_names', label: 'Buyer Name(s)', type: 'array', required: true, hint: 'Full legal names of all buyers' },
      { key: 'seller_names', label: 'Seller Name(s)', type: 'array', required: true, hint: 'Full legal names of all sellers' },
      { key: 'property_address', label: 'Property Address', type: 'text', required: true },
      { key: 'county', label: 'County', type: 'text', required: true },
      { key: 'sale_price', label: 'Sale Price ($)', type: 'number', required: true },
      { key: 'earnest_money', label: 'Earnest Money ($)', type: 'number', required: true },
      { key: 'earnest_money_holder', label: 'Earnest Money Held By', type: 'text' },
      { key: 'loan_type', label: 'Loan Type', type: 'select', options: ['Conventional','FHA','VA','USDA','Cash','Other'] },
      { key: 'loan_amount', label: 'Loan Amount ($)', type: 'number' },
      { key: 'binding_agreement_date', label: 'Binding Agreement Date', type: 'date' },
      { key: 'closing_date', label: 'Closing Date', type: 'date', required: true },
      { key: 'possession_date', label: 'Possession Date', type: 'date' },
      { key: 'home_warranty', label: 'Home Warranty Included', type: 'boolean' },
      { key: 'home_warranty_amount', label: 'Home Warranty Amount ($)', type: 'number' },
      { key: 'inspection_days', label: 'Inspection Period (days)', type: 'number' },
      { key: 'included_items', label: 'Included Items', type: 'text', hint: 'Appliances, fixtures, etc.' },
      { key: 'excluded_items', label: 'Excluded Items', type: 'text' },
      { key: 'seller_concessions', label: 'Seller Concessions ($)', type: 'number' },
    ]
  },
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
      { key: 'additional_terms', label: 'Additional/Modified Terms', type: 'text', hint: 'Any other modified terms from original offer' },
      { key: 'expiration_date', label: 'Counter Offer Expiration', type: 'date', required: true },
      { key: 'expiration_time', label: 'Expiration Time', type: 'text', hint: 'e.g. 5:00 PM CST' },
    ]
  },
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
      { key: 'listing_agent_name', label: "Listing Agent Name", type: 'text' },
      { key: 'buyer_agent_company', label: "Buyer's Agent Company", type: 'text' },
      { key: 'listing_agent_company', label: "Listing Agent Company", type: 'text' },
    ]
  }
}

export const FORM_LIST = Object.values(FORM_SCHEMAS)

export function getSchema(id: string): FormSchema | undefined {
  return FORM_SCHEMAS[id.toLowerCase()]
}

export function buildSystemPrompt(schema: FormSchema, filledFields: Record<string,unknown>): string {
  const missing = schema.fields
    .filter(f => f.required && !filledFields[f.key])
    .map(f => f.label)
  const filled = schema.fields
    .filter(f => filledFields[f.key])
    .map(f => `${f.label}: ${filledFields[f.key]}`)

  return `You are DealPilot AI, a Tennessee real estate transaction coordinator assistant built specifically for TN agents.
You are helping fill out the ${schema.name}.
${schema.description}

Current filled fields:
${filled.length ? filled.join('\n') : 'None yet'}

${missing.length ? `Required fields still needed: ${missing.join(', ')}` : 'All required fields are filled!'}

Behavior rules:
- Ask for one or two fields at a time in a natural, conversational way
- When the user provides info, confirm it and extract the exact values
- Use Tennessee real estate terminology (TCA 62, TREC forms, etc.)
- Flag any unusual terms (e.g. seller concessions over 6%, closing timelines under 14 days)
- When all required fields are collected, summarize the completed form and ask for confirmation
- You know Tennessee law (Title 62, Title 66), TREC forms, MLS rules, and TN agency disclosure rules
- Be concise, direct, and professional - built for working agents, not consumers
- Never provide legal advice; recommend attorney review for complex clauses`
}
