export type FieldType = 'text'|'number'|'date'|'currency'|'select'|'multiline'|'checkbox'|'party_name'|'address'

export type FieldDefinition = {
  fieldKey: string
  label: string
  lineNumber?: string | null
  type: FieldType
  required?: boolean
  autoFillSource?: string | null
  section?: string | number
  aiHint?: string | null
}

export type StepDef = { id: number; title: string; description?: string }

export type FormDefinition = {
  formId: string
  formName: string
  category: 'purchase_agreement' | 'addendum' | 'amendment' | 'exhibit' | 'disclosure' | 'miscellaneous'
  version: string
  description: string
  steps: StepDef[]
  fields: FieldDefinition[]
  autoFillMap?: Record<string,string>
  parentForm?: string | null
  complianceRules?: { ruleId:string; description:string; checkFn?: string }[]
  aiPromptContext?: string
}

import RF401 from './definitions/rf401'
import RF653 from './definitions/rf653'
import RF621 from './definitions/rf621'

export const FORM_REGISTRY: Record<string, FormDefinition> = {
  [RF401.formId]: RF401,
  [RF653.formId]: RF653,
  [RF621.formId]: RF621,
}

export default FORM_REGISTRY
