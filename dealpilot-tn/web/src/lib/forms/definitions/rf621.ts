import { FormDefinition } from '../form-registry'

const RF621: FormDefinition = {
  formId: 'rf621',
  formName: 'RF621 — Addendum to Purchase and Sale Agreement',
  category: 'addendum',
  version: '01/01/2026',
  description: 'Standard addendum template for PSAs',
  steps: [
    { id: 1, title: 'Select Deal' },
    { id: 2, title: 'Addendum Terms' },
    { id: 3, title: 'Review & Export' },
  ],
  fields: [
    { fieldKey: 'addendum_terms', label: 'Addendum Terms', type: 'multiline', required: true, section: 'section_2' },
  ],
  autoFillMap: {},
  parentForm: 'rf401',
  complianceRules: [],
  aiPromptContext: 'Create an addendum to the existing purchase agreement.'
}

export default RF621
