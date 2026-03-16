export type FieldType = 'text' | 'number' | 'date' | 'select' | 'boolean' | 'textarea' | 'array'

export interface FormFieldDefinition {
  id: string
  label: string
  type: FieldType
  required?: boolean
  hint?: string
  section?: string
  options?: string[]
  multiLine?: boolean
}

export interface FormStepDefinition {
  id: string
  label: string
  description?: string
  fieldIds: string[]
}

export type AutoFillMap = Record<string, string>

export interface AutoFillLogEntry {
  timestamp: string
  source: 'transaction' | 'ai' | string
  fields: Record<string, unknown>
  details?: string
  transactionId?: string
  formId?: string
}

export interface FormInstanceRecord {
  id: string
  form_id: string
  transaction_id: string
  field_data: Record<string, unknown>
  current_step: string
  status: string
  ai_fill_log: AutoFillLogEntry[]
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface FormDefinition {
  id: string
  name: string
  description: string
  category: 'purchase' | 'counteroffer' | 'amendment' | 'other'
  steps: FormStepDefinition[]
  fields: FormFieldDefinition[]
  autoFillMap?: AutoFillMap
  defaultStepId?: string
}

export type ComplianceOutcome = 'pass' | 'warn' | 'fail'

export interface ComplianceRuleResult {
  ruleId: string
  status: ComplianceOutcome
  message: string
  fields?: string[]
}
