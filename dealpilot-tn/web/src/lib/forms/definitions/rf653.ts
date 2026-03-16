import { FormDefinition } from '../form-registry'

const RF653: FormDefinition = {
  formId: 'rf653',
  formName: 'RF653 — Amendment to Purchase and Sale Agreement',
  category: 'amendment',
  version: '01/01/2026',
  description: 'Amendment form to modify terms of an existing PSA',
  steps: [
    { id: 1, title: 'Select Deal' },
    { id: 2, title: 'Reference Original Agreement' },
    { id: 3, title: 'Amendment Details' },
    { id: 4, title: 'Review & Export' },
  ],
  fields: [
    { fieldKey: 'original_agreement_date', label: 'Original Agreement Date', type: 'date', required: true, section: 'section_1' },
    { fieldKey: 'amendment_text', label: 'Amendment Details', type: 'multiline', required: true, section: 'section_3' },
  ],
  autoFillMap: {
    buyer_names: 'buyer_name',
    seller_names: 'seller_name',
  },
  parentForm: 'rf401',
  complianceRules: [],
  aiPromptContext: 'Assist the user in drafting an amendment to an existing PSA.'
}

export default RF653
