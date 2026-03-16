import type { ComplianceRuleResult, FormDefinition } from './types'

export function evaluateComplianceRules(fieldData: Record<string, unknown>, definition: FormDefinition): ComplianceRuleResult[] {
  const results: ComplianceRuleResult[] = []
  const missingRequired = definition.fields.filter(field => field.required && (fieldData[field.id] === undefined || fieldData[field.id] === null || fieldData[field.id] === ''))

  missingRequired.forEach(field => {
    results.push({
      ruleId: `required:${field.id}`,
      status: 'warn',
      message: `${field.label} is still empty but required for a complete ${definition.name}.`,
      fields: [field.id],
    })
  })

  results.push({
    ruleId: 'stub:phase21',
    status: 'pass',
    message: 'Phase 21 compliance checks are not fully configured yet. Please review before export.',
  })

  return results
}
