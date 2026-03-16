import { FormDefinition } from '../types'

export const RF621_FORM: FormDefinition = {
  id: 'rf621',
  name: 'RF621 – Inspection & Certification Summary',
  description: 'Phase 21 inspection certification worksheet for Tennessee transactions',
  category: 'other',
  defaultStepId: 'select-deal',
  steps: [
    { id: 'select-deal', label: 'Select Deal', fieldIds: ['deal_reference'] },
    {
      id: 'certification',
      label: 'Inspection Certification',
      fieldIds: ['buyer_names', 'seller_names', 'property_address', 'inspection_date', 'inspection_outcome', 'inspection_notes'],
    },
    {
      id: 'financing',
      label: 'Financing Snapshot',
      fieldIds: ['loan_type', 'loan_amount', 'loan_status'],
    },
    { id: 'review-export', label: 'Review & Export', fieldIds: ['review_notes'] },
  ],
  fields: [
    { id: 'deal_reference', label: 'Deal reference', type: 'text', required: true },
    { id: 'buyer_names', label: 'Buyer(s)', type: 'text', required: true },
    { id: 'seller_names', label: 'Seller(s)', type: 'text', required: true },
    { id: 'property_address', label: 'Property address', type: 'text', required: true },
    { id: 'inspection_date', label: 'Inspection date', type: 'date' },
    { id: 'inspection_outcome', label: 'Inspection outcome', type: 'select', options: ['Passed', 'Failed', 'Pending'] },
    { id: 'inspection_notes', label: 'Inspection notes', type: 'textarea', multiLine: true },
    { id: 'loan_type', label: 'Loan type', type: 'text' },
    { id: 'loan_amount', label: 'Loan amount ($)', type: 'number' },
    { id: 'loan_status', label: 'Loan status', type: 'select', options: ['Approved', 'Pending', 'Denied'] },
    { id: 'review_notes', label: 'Review notes', type: 'textarea', multiLine: true },
  ],
  autoFillMap: {
    address: 'property_address',
    buyer_names: 'buyer_names',
    seller_names: 'seller_names',
    purchase_price: 'loan_amount',
  },
}
