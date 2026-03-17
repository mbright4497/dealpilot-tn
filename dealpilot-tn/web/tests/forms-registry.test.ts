import { FORM_REGISTRY } from '@/lib/forms/form-registry'

describe('form registry', () => {
  it('exposes core RF401 workflow', () => {
    const rf401 = FORM_REGISTRY.rf401
    expect(rf401).toBeDefined()
    expect(rf401?.steps.map(step => step.id)).toEqual([
      'select-deal',
      'verify-parties',
      'property-price',
      'financing-contingencies',
      'stipulations',
      'review-export',
    ])
    expect(rf401?.fields.some(field => field.id === 'sale_price')).toBe(true)
  })

  it('ensures every step references known fields', () => {
    const rf401 = FORM_REGISTRY.rf401
    rf401?.steps.forEach(step => {
      step.fieldIds.forEach(fieldId => {
        const exists = rf401.fields.some(field => field.id === fieldId)
        expect(exists).toBe(true)
      })
    })
  })

  it('autoFillMap refers to valid fields', () => {
    const rf401 = FORM_REGISTRY.rf401
    const autoFillIds = Object.values(rf401.autoFillMap || {})
    autoFillIds.forEach(fieldId => {
      const exists = rf401.fields.some(field => field.id === fieldId)
      expect(exists).toBe(true)
    })
  })
})
