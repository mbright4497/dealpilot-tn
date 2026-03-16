import { FormDefinition } from '../form-registry'

const RF401: FormDefinition = {
  formId: 'rf401',
  formName: 'RF401 — Purchase and Sale Agreement (Sample)',
  category: 'purchase_agreement',
  version: '01/01/2026',
  description: 'Standard Purchase and Sale Agreement used in Tennessee (sample)',
  steps: [
    { id: 1, title: 'Select Deal' },
    { id: 2, title: 'Verify Parties' },
    { id: 3, title: 'Property & Price' },
    { id: 4, title: 'Financing & Contingencies' },
    { id: 5, title: 'Stipulations' },
    { id: 6, title: 'Review & Export' },
  ],
  fields: [
    { fieldKey: 'buyer_name', label: 'Buyer Name', type: 'party_name', required: true, autoFillSource: 'buyer_names', section: 'section_1', aiHint: 'Full legal name(s) of buyer(s)' },
    { fieldKey: 'seller_name', label: 'Seller Name', type: 'party_name', required: true, autoFillSource: 'seller_names', section: 'section_1' },
    { fieldKey: 'property_address', label: 'Property Address', type: 'address', required: true, autoFillSource: 'address', section: 'section_2' },
    { fieldKey: 'purchase_price', label: 'Purchase Price', type: 'currency', required: true, autoFillSource: 'purchase_price', section: 'section_2' },
    { fieldKey: 'closing_date', label: 'Closing Date', type: 'date', required: true, autoFillSource: 'closing_date', section: 'section_3' },
    { fieldKey: 'earnest_money', label: 'Earnest Money', type: 'currency', required: false, autoFillSource: 'earnest_money', section: 'section_3' },
    { fieldKey: 'special_stipulations', label: 'Special Stipulations', type: 'multiline', required: false, section: 'section_5' },
  ],
  autoFillMap: {
    address: 'property_address',
    purchase_price: 'purchase_price',
    closing_date: 'closing_date',
    buyer_names: 'buyer_name',
    seller_names: 'seller_name',
  },
  parentForm: null,
  complianceRules: [
    { ruleId: 'price_positive', description: 'Purchase price must be a positive number', checkFn: 'checkPricePositive' },
  ],
  aiPromptContext: 'Use Tennessee contract conventions. Do not fabricate values; suggest missing fields to user.'
}

export default RF401
