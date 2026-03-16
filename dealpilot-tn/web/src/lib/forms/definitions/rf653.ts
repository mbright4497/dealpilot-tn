import { FormDefinition } from '../types'

export const RF653_FORM: FormDefinition = {
  id: 'rf653',
  name: 'RF653 – Counter Offer Addendum',
  description: 'Phase 21 counter offer addendum workflow for Tennessee deals',
  category: 'counteroffer',
  defaultStepId: 'select-deal',
  steps: [
    { id: 'select-deal', label: 'Select Deal', fieldIds: ['deal_reference'] },
    {
      id: 'agreement-terms',
      label: 'Agreement Terms',
      fieldIds: ['buyer_names', 'seller_names', 'property_address', 'counter_offer_price', 'closing_date', 'seller_concessions'],
    },
    {
      id: 'contingencies',
      label: 'Contingencies & Deadlines',
      fieldIds: ['inspection_contingency', 'financing_contingency_date', 'appraisal_contingency'],
    },
    { id: 'stipulations', label: 'Special Stipulations', fieldIds: ['special_stipulations'] },
    { id: 'review-export', label: 'Review & Export', fieldIds: ['review_notes'] },
  ],
  fields: [
    { id: 'deal_reference', label: 'Deal reference', type: 'text', required: true },
    { id: 'buyer_names', label: 'Buyer(s)', type: 'text', required: true },
    { id: 'seller_names', label: 'Seller(s)', type: 'text', required: true },
    { id: 'property_address', label: 'Property address', type: 'text', required: true },
    { id: 'counter_offer_price', label: 'Counter offer price ($)', type: 'number' },
    { id: 'closing_date', label: 'Revised closing date', type: 'date' },
    { id: 'seller_concessions', label: 'Seller concessions ($)', type: 'number' },
    { id: 'inspection_contingency', label: 'Inspection contingency notes', type: 'textarea', multiLine: true },
    { id: 'financing_contingency_date', label: 'Financing contingency deadline', type: 'date' },
    { id: 'appraisal_contingency', label: 'Appraisal contingency notes', type: 'textarea', multiLine: true },
    { id: 'special_stipulations', label: 'Special stipulations', type: 'textarea', multiLine: true },
    { id: 'review_notes', label: 'Review notes', type: 'textarea', multiLine: true },
  ],
  autoFillMap: {
    address: 'property_address',
    buyer_names: 'buyer_names',
    seller_names: 'seller_names',
    closing: 'closing_date',
    purchase_price: 'counter_offer_price',
  },
}
